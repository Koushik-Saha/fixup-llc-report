import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import dayjs from 'dayjs'
import utc from 'dayjs/plugin/utc'

dayjs.extend(utc)

export const generateMonthlyReportPDF = (
    data: any[],
    expensesList: any[],
    summary: any,
    storeName: string,
    staffName: string | undefined,
    dateLabel: string
) => {
    const doc = new jsPDF()
    const now = dayjs().format('MMMM D, YYYY h:mm A')

    // Header Info
    doc.setFontSize(18)
    doc.text(`Monthly Report: ${storeName}`, 14, 22)
    
    doc.setFontSize(10)
    doc.setTextColor(100)
    doc.text(`Period: ${dateLabel}`, 14, 30)
    if (staffName) doc.text(`Downloaded By: ${staffName}`, 14, 36)
    doc.text(`Downloaded On: ${now}`, 14, 42)

    // Construct main data table
    const tableColumns = ["Date", "Status", "Revenue", "Cash", "Card", "Expenses", "Balance"]
    // Filter and extract only necessary fields for the main table to keep PDF clean
    const tableRows = data.map(r => [
        dayjs.utc(r.report_date).format('MM/DD/YYYY'),
        r.status,
        (r.status !== 'Missing' && r.status !== 'Closed') ? `$${(Number(r.cash_amount || 0) + Number(r.card_amount || 0)).toFixed(2)}` : '—',
        (r.status !== 'Missing' && r.status !== 'Closed') ? `$${Number(r.cash_amount || 0).toFixed(2)}` : '—',
        (r.status !== 'Missing' && r.status !== 'Closed') ? `$${Number(r.card_amount || 0).toFixed(2)}` : '—',
        (r.status !== 'Missing' && r.status !== 'Closed') || (r.admin_expenses_amount || 0) > 0 ? `$${((r.status !== 'Missing' && r.status !== 'Closed' ? Number(r.expenses_amount || 0) + Number(r.payouts_amount || 0) : 0) + Number(r.admin_expenses_amount || 0)).toFixed(2)}` : '—',
        (r.status !== 'Missing' && r.status !== 'Closed') || (r.admin_expenses_amount || 0) > 0 ? `$${((r.status !== 'Missing' && r.status !== 'Closed' ? Number(r.cash_amount || 0) + Number(r.card_amount || 0) : 0) - ((r.status !== 'Missing' && r.status !== 'Closed' ? Number(r.expenses_amount || 0) + Number(r.payouts_amount || 0) : 0) + Number(r.admin_expenses_amount || 0))).toFixed(2)}` : '—'
    ])

    // Add Totals Row
    const tRevenue = data.reduce((s, r) => s + (r.status !== 'Missing' && r.status !== 'Closed' ? (Number(r.cash_amount || 0) + Number(r.card_amount || 0)) : 0), 0)
    const tCash = data.reduce((s, r) => s + (r.status !== 'Missing' && r.status !== 'Closed' ? Number(r.cash_amount || 0) : 0), 0)
    const tCard = data.reduce((s, r) => s + (r.status !== 'Missing' && r.status !== 'Closed' ? Number(r.card_amount || 0) : 0), 0)
    const tExp = data.reduce((s, r) => s + (r.status !== 'Missing' && r.status !== 'Closed' ? (Number(r.expenses_amount || 0) + Number(r.payouts_amount || 0)) : 0) + Number(r.admin_expenses_amount || 0), 0)
    const tBalance = tRevenue - tExp

    tableRows.push([
        'TOTALS',
        '',
        `$${tRevenue.toFixed(2)}`,
        `$${tCash.toFixed(2)}`,
        `$${tCard.toFixed(2)}`,
        `$${tExp.toFixed(2)}`,
        `$${tBalance.toFixed(2)}`
    ])

    autoTable(doc, {
        startY: 48,
        head: [tableColumns],
        body: tableRows,
        theme: 'striped',
        styles: { fontSize: 8 },
        headStyles: { fillColor: [59, 130, 246] },
        foot: [],
        footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: 'bold' },
        didParseCell: function (data) {
            // Make the total row bold
            if (data.row.index === tableRows.length - 1) {
                data.cell.styles.fontStyle = 'bold'
                data.cell.styles.fillColor = [240, 240, 240]
            }
        }
    });

    // Handle Detailed Expenses Table
    // Synthesize daily metrics into expenses list so everything maps smoothly
    let allExpenses = expensesList ? [...expensesList] : []
    data.forEach(r => {
        if (r.status !== 'Missing' && r.status !== 'Closed') {
            if (Number(r.expenses_amount || 0) > 0) {
                allExpenses.push({
                    expense_date: r.report_date,
                    category: 'Daily Petty Cash',
                    payment_method: 'Cash',
                    amount: Number(r.expenses_amount),
                    user: r.submitted_by || { name: 'Staff' },
                    notes: r.notes || '',
                    review_note: r.status === 'Verified' ? 'Verified as part of daily report' : (r.status === 'CorrectionRequested' ? 'Pending Correction' : 'Pending Verification'),
                    source: 'DailyReport'
                })
            }
            if (Number(r.payouts_amount || 0) > 0) {
                allExpenses.push({
                    expense_date: r.report_date,
                    category: 'Payouts',
                    payment_method: 'Cash',
                    amount: Number(r.payouts_amount),
                    user: r.submitted_by || { name: 'Staff' },
                    notes: r.notes || '',
                    review_note: r.status === 'Verified' ? 'Verified as part of daily report' : (r.status === 'CorrectionRequested' ? 'Pending Correction' : 'Pending Verification'),
                    source: 'DailyReport'
                })
            }
        }
    })
    
    allExpenses.sort((a, b) => dayjs(b.expense_date).diff(dayjs(a.expense_date)))

    if (allExpenses.length > 0) {
        const finalY = (doc as any).lastAutoTable.finalY || 48
        const startY = finalY + 15

        doc.setFontSize(14)
        doc.setTextColor(0)
        doc.text('Detailed Expenses Log', 14, startY)
        doc.setFontSize(9)
        doc.setTextColor(100)
        doc.text('A comprehensive list of all manual store expenses and adjustments.', 14, startY + 6)

        const expCols = ["Date", "Category", "Method", "Amount", "Submitted By", "Notes"]
        const expRows = allExpenses.map(e => {
            let noteText = ''
            if (e.notes) noteText += e.notes
            if (e.review_note) noteText += (noteText ? ' | ' : '') + `[Review: ${e.review_note}]`
            
            return [
                dayjs.utc(e.expense_date).format('MM/DD/YYYY'),
                e.category || 'N/A',
                e.payment_method || 'N/A',
                `$${Number(e.amount || 0).toFixed(2)}`,
                e.user?.name || 'Unknown',
                noteText || '—'
            ]
        })

        autoTable(doc, {
            startY: startY + 10,
            head: [expCols],
            body: expRows,
            theme: 'grid',
            styles: { fontSize: 8 },
            headStyles: { fillColor: [239, 68, 68] },
        })
    }

    doc.save(`Monthly-Report-${storeName.replace(/\s+/g, '-')}-${dayjs().format('MM-DD-YY')}.pdf`)
}

export const generateMonthlyReportCSV = (
    data: any[],
    expensesList: any[],
    summary: any,
    storeName: string,
    staffName: string | undefined,
    dateLabel: string
) => {
    // 1. Build Main Header Block
    let csvContent = "data:text/csv;charset=utf-8,"
    csvContent += `Monthly Report,${storeName}\n`
    csvContent += `Period,${dateLabel}\n`
    csvContent += `Downloaded By,${staffName || 'Unknown'}\n`
    csvContent += `Date Downloaded,${dayjs().format('MMMM D YYYY hh:mm A')}\n\n`

    // 2. Build Daily Grid
    csvContent += "Date,Status,Revenue,Cash,Card,Expenses,Balance,Submitted By\n"
    
    data.forEach(r => {
        const d = dayjs.utc(r.report_date).format('MM/DD/YYYY')
        const st = r.status
        const rev = (st !== 'Missing' && st !== 'Closed') ? (Number(r.cash_amount || 0) + Number(r.card_amount || 0)).toFixed(2) : ''
        const cash = (st !== 'Missing' && st !== 'Closed') ? Number(r.cash_amount || 0).toFixed(2) : ''
        const card = (st !== 'Missing' && st !== 'Closed') ? Number(r.card_amount || 0).toFixed(2) : ''
        const exp = (st !== 'Missing' && st !== 'Closed') || (r.admin_expenses_amount || 0) > 0 ? ((st !== 'Missing' && st !== 'Closed' ? Number(r.expenses_amount || 0) + Number(r.payouts_amount || 0) : 0) + Number(r.admin_expenses_amount || 0)).toFixed(2) : ''
        const bal = (st !== 'Missing' && st !== 'Closed') || (r.admin_expenses_amount || 0) > 0 ? ((st !== 'Missing' && st !== 'Closed' ? Number(r.cash_amount || 0) + Number(r.card_amount || 0) : 0) - ((st !== 'Missing' && st !== 'Closed' ? Number(r.expenses_amount || 0) + Number(r.payouts_amount || 0) : 0) + Number(r.admin_expenses_amount || 0))).toFixed(2) : ''
        const sub = r.submitted_by?.name || ''
        
        // Escape notes and strings that might have commas
        csvContent += `"${d}","${st}","${rev}","${cash}","${card}","${exp}","${bal}","${sub}"\n`
    })

    // Totals Row
    const tRevenue = data.reduce((s, r) => s + (r.status !== 'Missing' && r.status !== 'Closed' ? (Number(r.cash_amount || 0) + Number(r.card_amount || 0)) : 0), 0)
    const tCash = data.reduce((s, r) => s + (r.status !== 'Missing' && r.status !== 'Closed' ? Number(r.cash_amount || 0) : 0), 0)
    const tCard = data.reduce((s, r) => s + (r.status !== 'Missing' && r.status !== 'Closed' ? Number(r.card_amount || 0) : 0), 0)
    const tExp = data.reduce((s, r) => s + (r.status !== 'Missing' && r.status !== 'Closed' ? (Number(r.expenses_amount || 0) + Number(r.payouts_amount || 0)) : 0) + Number(r.admin_expenses_amount || 0), 0)
    const tBalance = tRevenue - tExp

    csvContent += `"TOTALS","","${tRevenue.toFixed(2)}","${tCash.toFixed(2)}","${tCard.toFixed(2)}","${tExp.toFixed(2)}","${tBalance.toFixed(2)}",""\n\n\n`

    // 3. Build Detailed Expenses
    let allExpenses = expensesList ? [...expensesList] : []
    data.forEach(r => {
        if (r.status !== 'Missing' && r.status !== 'Closed') {
            if (Number(r.expenses_amount || 0) > 0) {
                allExpenses.push({
                    expense_date: r.report_date,
                    category: 'Daily Petty Cash',
                    payment_method: 'Cash',
                    amount: Number(r.expenses_amount),
                    user: r.submitted_by || { name: 'Staff' },
                    notes: r.notes || '',
                    review_note: r.status === 'Verified' ? 'Verified as part of daily report' : (r.status === 'CorrectionRequested' ? 'Pending Correction' : 'Pending Verification')
                })
            }
            if (Number(r.payouts_amount || 0) > 0) {
                allExpenses.push({
                    expense_date: r.report_date,
                    category: 'Payouts',
                    payment_method: 'Cash',
                    amount: Number(r.payouts_amount),
                    user: r.submitted_by || { name: 'Staff' },
                    notes: r.notes || '',
                    review_note: r.status === 'Verified' ? 'Verified as part of daily report' : (r.status === 'CorrectionRequested' ? 'Pending Correction' : 'Pending Verification')
                })
            }
        }
    })
    allExpenses.sort((a, b) => dayjs(b.expense_date).diff(dayjs(a.expense_date)))

    if (allExpenses.length > 0) {
        csvContent += "DETAILED EXPENSES LOG\n"
        csvContent += "Date,Category,Method,Amount,Submitted By,Notes\n"
        
        allExpenses.forEach(e => {
            const date = dayjs.utc(e.expense_date).format('MM/DD/YYYY')
            
            let noteText = ''
            if (e.notes) noteText += e.notes
            if (e.review_note) noteText += (noteText ? ' | ' : '') + `[Review: ${e.review_note}]`

            // escape potential commas in notes 
            const notes = noteText ? `"${noteText.replace(/"/g, '""')}"` : '""'
            const user = e.user?.name ? `"${e.user.name}"` : '""'

            csvContent += `"${date}","${e.category || ''}","${e.payment_method || ''}","${Number(e.amount || 0).toFixed(2)}",${user},${notes}\n`
        })
    }

    const encodedUri = encodeURI(csvContent)
    const link = document.createElement("a")
    link.setAttribute("href", encodedUri)
    link.setAttribute("download", `Monthly-Report-${storeName.replace(/\s+/g, '-')}-${dayjs().format('MM-DD-YY')}.csv`)
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
}
