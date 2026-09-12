/**
 * 「案件入力」シートを作成する
 * ・案件No, 案件名, 担当者, 状況 などを手入力
 * ・人件費/原価合計/粗利益/利益率は数式で自動計算
 */
function setupInputSheet() {
  const sheet = getOrCreateSheet_(SHEET_NAMES.INPUT);
  sheet.clear();
  sheet.clearFormats();

  sheet.getRange(1, 1, 1, INPUT_HEADERS.length)
    .setValues([INPUT_HEADERS])
    .setFontWeight('bold')
    .setBackground(HEADER_BACKGROUND)
    .setFontColor(HEADER_FONT_COLOR);
  sheet.setFrozenRows(1);

  const rows = INPUT_TEMPLATE_ROWS;
  const laborCostFormulas = [];
  const totalCostFormulas = [];
  const grossProfitFormulas = [];
  const marginFormulas = [];

  for (let i = 0; i < rows; i++) {
    const r = i + 2;
    laborCostFormulas.push(['=IF(AND(G' + r + '="",H' + r + '=""),"",G' + r + '*H' + r + ')']);
    totalCostFormulas.push(['=IF(E' + r + '="","",F' + r + '+I' + r + '+J' + r + ')']);
    grossProfitFormulas.push(['=IF(E' + r + '="","",E' + r + '-K' + r + ')']);
    marginFormulas.push(['=IF(OR(E' + r + '="",E' + r + '=0),"",L' + r + '/E' + r + ')']);
  }

  sheet.getRange(2, COL.LABOR_COST, rows, 1).setFormulas(laborCostFormulas);
  sheet.getRange(2, COL.TOTAL_COST, rows, 1).setFormulas(totalCostFormulas);
  sheet.getRange(2, COL.GROSS_PROFIT, rows, 1).setFormulas(grossProfitFormulas);
  sheet.getRange(2, COL.MARGIN, rows, 1).setFormulas(marginFormulas);

  sheet.getRange(2, COL.MARGIN, rows, 1).setNumberFormat('0.0%');
  sheet.getRange(2, COL.INVOICE_DATE, rows, 1).setNumberFormat('yyyy/mm/dd');
  [COL.REVENUE, COL.OUTSOURCE_COST, COL.DAILY_RATE, COL.LABOR_COST, COL.OTHER_COST, COL.TOTAL_COST, COL.GROSS_PROFIT]
    .forEach(function (c) {
      sheet.getRange(2, c, rows, 1).setNumberFormat('#,##0');
    });

  // 状況：ドロップダウン選択
  const statusRule = SpreadsheetApp.newDataValidation()
    .requireValueInList(STATUS_OPTIONS, true)
    .setAllowInvalid(false)
    .build();
  sheet.getRange(2, COL.STATUS, rows, 1).setDataValidation(statusRule);

  // 利益率が低い行を強調表示
  const marginRange = sheet.getRange(2, COL.MARGIN, rows, 1);
  const lowMarginRule = SpreadsheetApp.newConditionalFormatRule()
    .whenNumberLessThan(LOW_MARGIN_THRESHOLD)
    .setBackground(RISK_BACKGROUND)
    .setRanges([marginRange])
    .build();
  sheet.setConditionalFormatRules([lowMarginRule]);

  sheet.autoResizeColumns(1, INPUT_HEADERS.length);
}

/**
 * 「担当者マスタ」シートを作成する
 * ・担当者ごとの月間稼働可能日数を登録（未登録の担当者はデフォルト値を使用）
 */
function setupMemberSheet() {
  const sheet = getOrCreateSheet_(SHEET_NAMES.MEMBERS);
  sheet.clear();
  sheet.clearFormats();

  sheet.getRange(1, 1, 1, MEMBER_HEADERS.length)
    .setValues([MEMBER_HEADERS])
    .setFontWeight('bold')
    .setBackground(HEADER_BACKGROUND)
    .setFontColor(HEADER_FONT_COLOR);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, MEMBER_HEADERS.length);
}

/**
 * 「案件別集計」シートの器を用意する（中身は updateProjectSummary_ で書き込む）
 */
function setupProjectSummarySheet() {
  getOrCreateSheet_(SHEET_NAMES.PROJECT_SUMMARY);
}

/**
 * 「担当者別集計」シートの器を用意する（中身は updateMemberSummary_ で書き込む）
 */
function setupMemberSummarySheet() {
  getOrCreateSheet_(SHEET_NAMES.MEMBER_SUMMARY);
}

/**
 * 「ダッシュボード」シートの器を用意する（中身は updateDashboard_ で書き込む）
 */
function setupDashboardSheet() {
  getOrCreateSheet_(SHEET_NAMES.DASHBOARD);
}
