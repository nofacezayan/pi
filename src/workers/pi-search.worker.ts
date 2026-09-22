/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// Knuth-Morris-Pratt (KMP) search helper
function buildKMPTable(pattern: string): number[] {
  const table = new Array<number>(pattern.length).fill(0);
  let length = 0;
  let i = 1;

  while (i < pattern.length) {
    if (pattern[i] === pattern[length]) {
      length++;
      table[i] = length;
      i++;
    } else {
      if (length !== 0) {
        length = table[length - 1];
      } else {
        table[i] = 0;
        i++;
      }
    }
  }
  return table;
}

self.onmessage = (e: MessageEvent) => {
  const { type, query, piDigits, includesLeadingThree } = e.data;

  if (type === 'START') {
    // Prefix '3' if toggle is on
    const fullPi = includesLeadingThree ? '3' + piDigits : piDigits;
    const queryStr = String(query).replace(/\s/g, ''); // strip any accidental whitespace

    if (!queryStr || !/^\d+$/.test(queryStr)) {
      self.postMessage({ type: 'ERROR', message: 'Invalid query' });
      return;
    }

    const totalDigits = fullPi.length;
    const queryLength = queryStr.length;

    // KMP Table Build
    const kmpTable = buildKMPTable(queryStr);

    const startTime = performance.now();
    let digitsScanned = 0;
    let queryIndex = 0;
    let piIndex = 0;

    const CHUNK_SIZE = 1000000; // Scan in 1-million digit blocks to report progress
    let isCancelled = false;

    // Listener for cancel message
    const cancelHandler = (cancelEvent: MessageEvent) => {
      if (cancelEvent.data && cancelEvent.data.type === 'CANCEL') {
        isCancelled = true;
      }
    };
    self.addEventListener('message', cancelHandler);

    function scanChunk() {
      if (isCancelled) {
        const duration = (performance.now() - startTime) / 1000;
        self.postMessage({
          type: 'CANCELLED',
          digitsSearched: digitsScanned,
          durationSeconds: duration,
        });
        self.removeEventListener('message', cancelHandler);
        return;
      }

      const chunkEnd = Math.min(piIndex + CHUNK_SIZE, totalDigits);
      
      while (piIndex < chunkEnd) {
        if (fullPi[piIndex] === queryStr[queryIndex]) {
          piIndex++;
          queryIndex++;

          if (queryIndex === queryLength) {
            // MATCH FOUND!
            const matchIndex = piIndex - queryLength;
            const duration = (performance.now() - startTime) / 1000;

            // Get surrounding window for visualization
            const windowRadius = 15;
            const startContext = Math.max(0, matchIndex - windowRadius);
            const endContext = Math.min(totalDigits, matchIndex + queryLength + windowRadius);

            const beforeContext = fullPi.slice(startContext, matchIndex);
            const afterContext = fullPi.slice(matchIndex + queryLength, endContext);

            // True Position adjustment
            // If includesLeadingThree is true, the leading "3" is index 0, first decimal "1" is index 1.
            // If includesLeadingThree is false, the first decimal "1" is index 1.
            // We'll report position as 1-based index consistently.
            let position = matchIndex;
            if (!includesLeadingThree) {
              position = matchIndex + 1; // position 1 is "1" after decimal point
            }

            self.postMessage({
              type: 'FOUND',
              position,
              digitsSearched: piIndex,
              durationSeconds: duration,
              matchBeforeDecimal: includesLeadingThree && matchIndex === 0,
              surrounding: {
                before: beforeContext,
                match: queryStr,
                after: afterContext,
              },
            });
            self.removeEventListener('message', cancelHandler);
            return;
          }
        } else {
          if (queryIndex !== 0) {
            queryIndex = kmpTable[queryIndex - 1];
          } else {
            piIndex++;
          }
        }
      }

      digitsScanned = piIndex;
      const elapsedMs = performance.now() - startTime;
      const progress = totalDigits > 0 ? (digitsScanned / totalDigits) * 100 : 0;
      const speed = elapsedMs > 0 ? (digitsScanned / (elapsedMs / 1000)) : 0;
      const remainingDigits = totalDigits - digitsScanned;
      const etaSeconds = speed > 0 ? remainingDigits / speed : 0;

      self.postMessage({
        type: 'PROGRESS',
        progress: Math.min(100, Math.floor(progress)),
        digitsScanned,
        speedMillionsPerSec: Number((speed / 1000000).toFixed(2)),
        etaSeconds: Math.max(0, Math.round(etaSeconds)),
      });

      if (piIndex < totalDigits) {
        // Queue next chunk
        setTimeout(scanChunk, 0);
      } else {
        // END OF SCAN - NOT FOUND
        const duration = (performance.now() - startTime) / 1000;
        self.postMessage({
          type: 'NOT_FOUND',
          digitsSearched: totalDigits,
          durationSeconds: duration,
        });
        self.removeEventListener('message', cancelHandler);
      }
    }

    // Start scanning
    scanChunk();
  }
};
