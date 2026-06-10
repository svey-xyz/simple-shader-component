// Registered via bunfig.toml [test].preload — gives every test a real DOM
// (window, document, events, rAF) via happy-dom before test files load.
import { GlobalRegistrator } from "@happy-dom/global-registrator";

GlobalRegistrator.register();
