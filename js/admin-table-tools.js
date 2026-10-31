// Dashboard tables: search, status filter and sortable columns.
// Works on the rows js/admin.js renders: a data row carries data-status, and
// a cell can carry data-sort (number) to sort by instead of its text.
// Rows are only shown/hidden and reordered, so re-renders keep the filters.
(function () {
    var TABLES = [
        { body: 'messagesTableBody', search: 'Search name, email or message', label: 'messages',
          statuses: [['unread', 'New'], ['read', 'Read'], ['replied', 'Replied'], ['approved', 'Approved']] },
        { body: 'appointmentsTableBody', search: 'Search client, email or service', label: 'appointments',
          statuses: [['pending', 'Pending'], ['confirmed', 'Confirmed'], ['completed', 'Completed'], ['cancelled', 'Cancelled']] },
        { body: 'casesTableBody', search: 'Search client, tracking code or matter', label: 'cases',
          statuses: [['initiated', 'Initiated'], ['review', 'In Review'], ['approved', 'Approved'], ['rejected', 'Rejected'], ['closed', 'Closed']] },
        { body: 'invoicesTableBody', search: 'Search invoice, client or service', label: 'invoices',
          statuses: [['pending', 'Pending'], ['paid', 'Paid']] },
        { body: 'receiptsTableBody', search: 'Search receipt or client', label: 'receipts' },
        { body: 'uploadsTableBody', search: 'Search case code or file name', label: 'files',
          statuses: [['pending', 'Pending'], ['approved', 'Approved']] }
    ];

    function setup(cfg) {
        var tbody = document.getElementById(cfg.body);
        if (!tbody) return;
        var table = tbody.closest('table');
        var container = table.closest('.table-container') || table;

        var bar = document.createElement('div');
        bar.className = 'kd-toolbar';
        bar.innerHTML =
            '<label class="kd-search"><i class="fa-solid fa-magnifying-glass" aria-hidden="true"></i>' +
            '<input type="search" placeholder="' + cfg.search + '" aria-label="' + cfg.search + '"></label>' +
            (cfg.statuses ? '<select class="kd-filter" aria-label="Filter by status"><option value="">All statuses</option>' +
                cfg.statuses.map(function (s) { return '<option value="' + s[0] + '">' + s[1] + '</option>'; }).join('') +
                '</select>' : '') +
            '<span class="kd-count" aria-live="polite"></span>';
        container.parentNode.insertBefore(bar, container);

        var input = bar.querySelector('input');
        var select = bar.querySelector('select');
        var count = bar.querySelector('.kd-count');
        var sort = { col: -1, dir: 1 };

        // Column headers sort, except the actions column
        var ths = table.querySelectorAll('thead th');
        Array.prototype.forEach.call(ths, function (th, i) {
            if (i === ths.length - 1 && /action|download/i.test(th.textContent)) return;
            th.classList.add('kd-sortable');
            th.tabIndex = 0;
            th.setAttribute('aria-sort', 'none');
            function go() {
                sort.dir = sort.col === i ? -sort.dir : 1;
                sort.col = i;
                Array.prototype.forEach.call(ths, function (h) { h.setAttribute('aria-sort', 'none'); });
                th.setAttribute('aria-sort', sort.dir === 1 ? 'ascending' : 'descending');
                apply();
            }
            th.addEventListener('click', go);
            th.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); } });
        });

        function dataRows() {
            return Array.prototype.filter.call(tbody.rows, function (r) { return r.hasAttribute('data-status') || r.dataset.row === 'data'; });
        }
        function cellValue(row) {
            var cell = row.cells[sort.col];
            if (!cell) return '';
            if (cell.hasAttribute('data-sort')) return Number(cell.getAttribute('data-sort')) || 0;
            return cell.textContent.trim().toLowerCase();
        }

        var busy = false;
        function apply() {
            busy = true;
            var rows = dataRows();
            // Receipts rows have no status; treat every non-placeholder row as data
            if (!rows.length && !cfg.statuses) {
                rows = Array.prototype.filter.call(tbody.rows, function (r) { return !r.classList.contains('kd-empty-row') && !r.querySelector('.kh-sk-pending'); });
            }
            if (sort.col >= 0 && rows.length > 1) {
                rows.slice().sort(function (a, b) {
                    var x = cellValue(a), y = cellValue(b);
                    return (x > y ? 1 : x < y ? -1 : 0) * sort.dir;
                }).forEach(function (r) { tbody.appendChild(r); });
            }
            var q = input.value.trim().toLowerCase();
            var st = select ? select.value : '';
            var shown = 0;
            rows.forEach(function (r) {
                var ok = (!q || r.textContent.toLowerCase().indexOf(q) !== -1) && (!st || r.getAttribute('data-status') === st);
                r.hidden = !ok;
                if (ok) shown++;
            });
            var none = tbody.querySelector('.kd-nomatch');
            if (rows.length && !shown) {
                if (!none) {
                    none = document.createElement('tr');
                    none.className = 'kd-nomatch';
                    none.innerHTML = '<td colspan="' + ths.length + '"><div class="kd-empty"><i class="fa-solid fa-filter-circle-xmark" aria-hidden="true"></i>No ' + cfg.label + ' match your search or filter.</div></td>';
                    tbody.appendChild(none);
                }
            } else if (none) {
                none.remove();
            }
            count.textContent = rows.length ? (shown === rows.length ? rows.length + ' ' + cfg.label : shown + ' of ' + rows.length + ' ' + cfg.label) : '';
            observer.takeRecords();
            busy = false;
        }

        input.addEventListener('input', apply);
        if (select) select.addEventListener('change', apply);
        // Re-apply after js/admin.js re-renders the rows
        var observer = new MutationObserver(function () { if (!busy) apply(); });
        observer.observe(tbody, { childList: true });
    }

    function init() { TABLES.forEach(setup); }
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
    else init();
})();
