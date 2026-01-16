importScripts('logic.js');

self.onmessage = function (e) {
    if (e.data.cmd === 'generate') {
        const lvl = e.data.level;
        // console.log(`Worker generating Level ${lvl}...`);

        // Use the shared function
        const data = generateSolvableLevel(lvl);

        // We need to return plain objects, not class instances because methods don't transfer.
        // Actually, structurally cloning class instances usually strips methods.
        // We will reconstruct Snakes on the main thread or `logic.js` allows "rehydration"?
        // Simpler: Send JSON data, and main thread maps them to new Snake(...)
        // The data returned by generateSolvableLevel contains Snake instances.

        const serializedSnakes = data.snakes.map(s => ({
            id: s.id,
            cells: s.cells,
            dirIndex: s.dirIndex,
            color: s.color
        }));

        self.postMessage({
            level: lvl,
            snakes: serializedSnakes,
            obstacles: data.obstacles,
            config: data.config
        });
    }
};
