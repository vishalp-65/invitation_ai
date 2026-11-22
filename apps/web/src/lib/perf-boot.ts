/**
 * Runs once before first paint (inlined in <head>). Marks low-end devices with `data-perf="lite"` on <html>:
 * data saver, 2G/3G, <=2 GB RAM, <=2 CPU cores, or both <=4 GB and <=4 cores
 * (either signal alone is too common on capable laptops / phones). `?perf=lite` / `?perf=full` force a tier for testing.
 * Kept out of perf.ts because that module is 'use client' (its exports are references on the server).
 */
export const LITE_BOOT_SCRIPT = `(function(){try{var n=navigator,c=n.connection||{},q=location.search,m=n.deviceMemory,k=n.hardwareConcurrency;var l=/[?&]perf=lite/.test(q)||c.saveData===true||/(^|-)2g$|^3g$/.test(c.effectiveType||'')||(m&&m<=2)||(k&&k<=2)||(m&&k&&m<=4&&k<=4);if(/[?&]perf=full/.test(q))l=false;if(l)document.documentElement.setAttribute('data-perf','lite')}catch(e){}})()`;
