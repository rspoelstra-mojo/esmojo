// Ook programmatische submit-events kunnen binnenkomen terwijl een knop disabled is.
export function singleSubmission(callback, isCurrent = () => true) {
  let pending = false;
  return async (...args) => {
    if (pending || !isCurrent()) return;
    pending = true;
    try { return await callback(...args); }
    finally { pending = false; }
  };
}
