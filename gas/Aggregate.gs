/**
 * 「案件入力」シートから、案件名が入力されている行だけを読み込んでオブジェクト配列にする
 */
function getInputData_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.INPUT);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) return [];

  const values = sheet.getRange(2, 1, lastRow - 1, INPUT_HEADERS.length).getValues();

  return values
    .filter(function (row) { return row[COL.NAME - 1] !== ''; })
    .map(function (row) {
      const marginRaw = row[COL.MARGIN - 1];
      return {
        no: row[COL.NO - 1],
        name: row[COL.NAME - 1],
        owner: row[COL.OWNER - 1],
        status: row[COL.STATUS - 1],
        revenue: Number(row[COL.REVENUE - 1]) || 0,
        outsourceCost: Number(row[COL.OUTSOURCE_COST - 1]) || 0,
        dailyRate: Number(row[COL.DAILY_RATE - 1]) || 0,
        workDays: Number(row[COL.WORK_DAYS - 1]) || 0,
        laborCost: Number(row[COL.LABOR_COST - 1]) || 0,
        otherCost: Number(row[COL.OTHER_COST - 1]) || 0,
        totalCost: Number(row[COL.TOTAL_COST - 1]) || 0,
        grossProfit: Number(row[COL.GROSS_PROFIT - 1]) || 0,
        margin: marginRaw === '' ? null : Number(marginRaw),
        invoiceDate: row[COL.INVOICE_DATE - 1],
        notes: row[COL.NOTES - 1],
      };
    });
}

/**
 * 案件が「要注意」かどうかを判定する
 * ・利益率がしきい値未満
 * ・状況が「要注意」
 * ・課題・備考に記載がある
 */
function isAtRiskProject_(project) {
  if (project.margin !== null && project.margin < LOW_MARGIN_THRESHOLD) return true;
  if (project.status === '要注意') return true;
  if (project.notes && String(project.notes).trim() !== '') return true;
  return false;
}

/**
 * 「担当者マスタ」から、担当者名 → 月間稼働可能日数 のマップを作る
 */
function getMemberCapacityMap_() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.MEMBERS);
  const lastRow = sheet.getLastRow();
  const map = {};
  if (lastRow < 2) return map;

  sheet.getRange(2, 1, lastRow - 1, MEMBER_HEADERS.length).getValues().forEach(function (row) {
    const name = row[0];
    if (name === '') return;
    const capacity = Number(row[1]);
    map[name] = capacity > 0 ? capacity : DEFAULT_MONTHLY_CAPACITY_DAYS;
  });
  return map;
}

/**
 * 「案件別集計」シートを更新する：案件ごとの状況・利益率と、全体の合計・平均利益率
 */
function updateProjectSummary_(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.PROJECT_SUMMARY);
  sheet.clear();
  sheet.clearFormats();

  const headers = ['案件No.', '案件名', '担当者', '状況', '売上', '原価合計', '粗利益', '利益率', '要注意'];
  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground(HEADER_BACKGROUND)
    .setFontColor(HEADER_FONT_COLOR);
  sheet.setFrozenRows(1);

  if (data.length === 0) return;

  const rows = data.map(function (p) {
    return [
      p.no, p.name, p.owner, p.status,
      p.revenue, p.totalCost, p.grossProfit, p.margin,
      isAtRiskProject_(p) ? '⚠️ 要注意' : '',
    ];
  });
  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(2, 8, rows.length, 1).setNumberFormat('0.0%');
  [5, 6, 7].forEach(function (c) {
    sheet.getRange(2, c, rows.length, 1).setNumberFormat('#,##0');
  });

  const totalRevenue = data.reduce(function (s, p) { return s + p.revenue; }, 0);
  const totalCost = data.reduce(function (s, p) { return s + p.totalCost; }, 0);
  const totalGrossProfit = data.reduce(function (s, p) { return s + p.grossProfit; }, 0);
  const avgMargin = totalRevenue !== 0 ? totalGrossProfit / totalRevenue : 0;

  const footerRow = rows.length + 3;
  const footerLabels = ['売上合計', '原価合計', '粗利益合計', '平均利益率'];
  const footerValues = [totalRevenue, totalCost, totalGrossProfit, avgMargin];
  for (let i = 0; i < footerLabels.length; i++) {
    sheet.getRange(footerRow + i, 1).setValue(footerLabels[i]).setFontWeight('bold');
    sheet.getRange(footerRow + i, 2).setValue(footerValues[i]);
  }
  sheet.getRange(footerRow, 2, 3, 1).setNumberFormat('#,##0');
  sheet.getRange(footerRow + 3, 2).setNumberFormat('0.0%');

  const dataRange = sheet.getRange(2, 1, rows.length, headers.length);
  const riskRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$I2<>""')
    .setBackground(RISK_BACKGROUND)
    .setRanges([dataRange])
    .build();
  sheet.setConditionalFormatRules([riskRule]);

  sheet.autoResizeColumns(1, headers.length);
}

/**
 * 「担当者別集計」シートを更新する：担当者ごとの案件数・売上・利益率・稼働率
 * 稼働率 = 担当案件の稼働日数（人日）合計 ÷ 月間稼働可能日数
 */
function updateMemberSummary_(data) {
  const capacityMap = getMemberCapacityMap_();

  const owners = {};
  data.forEach(function (p) {
    if (!p.owner) return;
    if (!owners[p.owner]) {
      owners[p.owner] = { count: 0, revenue: 0, cost: 0, grossProfit: 0, workDays: 0, atRisk: 0 };
    }
    const o = owners[p.owner];
    o.count += 1;
    o.revenue += p.revenue;
    o.cost += p.totalCost;
    o.grossProfit += p.grossProfit;
    o.workDays += p.workDays;
    if (isAtRiskProject_(p)) o.atRisk += 1;
  });

  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.MEMBER_SUMMARY);
  sheet.clear();
  sheet.clearFormats();

  const headers = [
    '担当者', '案件数', '売上合計', '粗利益合計', '平均利益率',
    '稼働日数合計', '月間稼働可能日数', '稼働率', '要注意案件数', '状態',
  ];
  sheet.getRange(1, 1, 1, headers.length)
    .setValues([headers])
    .setFontWeight('bold')
    .setBackground(HEADER_BACKGROUND)
    .setFontColor(HEADER_FONT_COLOR);
  sheet.setFrozenRows(1);

  const ownerNames = Object.keys(owners);
  if (ownerNames.length === 0) return;

  const rows = ownerNames.map(function (name) {
    const o = owners[name];
    const avgMargin = o.revenue !== 0 ? o.grossProfit / o.revenue : 0;
    const capacity = capacityMap[name] || DEFAULT_MONTHLY_CAPACITY_DAYS;
    const utilization = capacity !== 0 ? o.workDays / capacity : 0;

    const flags = [];
    if (utilization > OVERLOAD_THRESHOLD) flags.push('⚠️稼働過多');
    if (o.count > 0 && (o.atRisk / o.count) >= AT_RISK_RATIO_THRESHOLD) flags.push('⚠️低利益率案件が多い');

    return [
      name, o.count, o.revenue, o.grossProfit, avgMargin,
      o.workDays, capacity, utilization, o.atRisk, flags.join(' '),
    ];
  });

  sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.getRange(2, 3, rows.length, 2).setNumberFormat('#,##0');
  sheet.getRange(2, 5, rows.length, 1).setNumberFormat('0.0%');
  sheet.getRange(2, 8, rows.length, 1).setNumberFormat('0.0%');

  const dataRange = sheet.getRange(2, 1, rows.length, headers.length);
  const overloadRule = SpreadsheetApp.newConditionalFormatRule()
    .whenFormulaSatisfied('=$H2>1')
    .setBackground(RISK_BACKGROUND)
    .setRanges([dataRange])
    .build();
  sheet.setConditionalFormatRules([overloadRule]);

  sheet.autoResizeColumns(1, headers.length);
}

/**
 * 「ダッシュボード」シートを更新する：全体の売上・粗利益・利益率・案件数・要注意案件・メンバー数
 */
function updateDashboard_(data) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAMES.DASHBOARD);
  sheet.clear();
  sheet.clearFormats();

  const totalRevenue = data.reduce(function (s, p) { return s + p.revenue; }, 0);
  const totalGrossProfit = data.reduce(function (s, p) { return s + p.grossProfit; }, 0);
  const avgMargin = totalRevenue !== 0 ? totalGrossProfit / totalRevenue : 0;
  const projectCount = data.length;
  const atRiskCount = data.filter(isAtRiskProject_).length;
  const memberCount = new Set(data.map(function (p) { return p.owner; }).filter(function (o) { return o; })).size;

  sheet.getRange('A1').setValue('全体サマリー').setFontWeight('bold').setFontSize(14);
  sheet.getRange('A2').setValue('更新日時');
  sheet.getRange('B2').setValue(new Date()).setNumberFormat('yyyy/mm/dd hh:mm');

  const labels = ['売上', '粗利益', '利益率', '案件数', '要注意案件', 'メンバー'];
  const values = [totalRevenue, totalGrossProfit, avgMargin, projectCount, atRiskCount, memberCount];

  for (let i = 0; i < labels.length; i++) {
    const row = 4 + i;
    sheet.getRange(row, 1).setValue(labels[i] + '：').setFontWeight('bold');
    sheet.getRange(row, 2).setValue(values[i]);
  }
  sheet.getRange(4, 2).setNumberFormat('#,##0'); // 売上
  sheet.getRange(5, 2).setNumberFormat('#,##0'); // 粗利益
  sheet.getRange(6, 2).setNumberFormat('0.0%'); // 利益率

  sheet.autoResizeColumns(1, 2);
}
