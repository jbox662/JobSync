console.log("Store context test:");
import { useJobStore } from "./src/state/store";
const store = useJobStore.getState();
console.log("Store accessible:", !!store);
console.log("syncNow function exists:", typeof store.syncNow === "function");
