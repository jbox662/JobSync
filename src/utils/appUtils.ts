// Global function to force app remount
let forceAppRemount: (() => void) | null = null;

export const triggerAppRemount = () => {
  if (forceAppRemount) {
    forceAppRemount();
  } else {
    console.warn('App remount function not available');
  }
};

export const setAppRemountFunction = (remountFn: () => void) => {
  forceAppRemount = remountFn;
};

export const clearAppRemountFunction = () => {
  forceAppRemount = null;
};
