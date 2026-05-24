export function initMobileTables() {
  const process = () => {
    document.querySelectorAll("table").forEach((table) => {
      if (table.dataset.mobileReady) return;
      const headers = [];
      const thead = table.querySelector("thead");
      if (!thead) return;
      const headerRow = thead.querySelector("tr");
      if (!headerRow) return;
      headerRow.querySelectorAll("th").forEach((th) => {
        headers.push(th.textContent.trim());
      });
      if (headers.length === 0) return;
      table.querySelectorAll("tbody tr").forEach((row) => {
        row.querySelectorAll("td").forEach((td, idx) => {
          if (headers[idx]) {
            td.setAttribute("data-label", headers[idx]);
          }
        });
      });
      table.dataset.mobileReady = "true";
    });
  };

  process();
  const observer = new MutationObserver(process);
  observer.observe(document.body, { childList: true, subtree: true });
  return () => observer.disconnect();
}
