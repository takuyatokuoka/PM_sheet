/**
 * スプレッドシートを開いたときにメニューを追加する
 */
function onOpen() {
  SpreadsheetApp.getUi()
    .createMenu('案件管理')
    .addItem('① 初期セットアップ（シート作成）', 'setupAll')
    .addSeparator()
    .addItem('② 集計を更新', 'updateAllSummaries')
    .addToUi();
}

/**
 * 初期セットアップ：必要なシートをすべて作成し、初回の集計を行う
 * （メニューから呼ばれるエントリーポイント。エラー時は必ずダイアログで内容を表示する）
 */
function setupAll() {
  try {
    migrateLegacyDashboardSheet_();
    setupInputSheet();
    setupMemberSheet();
    setupProjectSummarySheet();
    setupMemberSummarySheet();
    setupDashboardSheets();
    updateAllSummaries_();
    deleteDefaultSheet_();

    SpreadsheetApp.getUi().alert(
      'セットアップが完了しました。\n' +
      '「' + SHEET_NAMES.INPUT + '」シートに案件データを入力し、\n' +
      'メニューの「案件管理」→「② 集計を更新」を実行してください。'
    );
  } catch (e) {
    SpreadsheetApp.getUi().alert('セットアップでエラーが発生しました：\n' + e.message);
    throw e;
  }
}

/**
 * 案件入力データをもとに、案件別集計・担当者別集計・ダッシュボードを再計算する
 * （メニューから呼ばれるエントリーポイント。成功/エラーを必ずダイアログで表示する）
 */
function updateAllSummaries() {
  try {
    updateAllSummaries_();
    SpreadsheetApp.getUi().alert('集計を更新しました。');
  } catch (e) {
    SpreadsheetApp.getUi().alert('集計の更新でエラーが発生しました：\n' + e.message);
    throw e;
  }
}

/**
 * 集計処理の本体（setupAll からも呼ばれるため、こちらはダイアログを出さない）
 */
function updateAllSummaries_() {
  const data = getInputData_();
  updateProjectSummary_(data);
  updateMemberSummary_(data);

  const ranges = getCurrentFiscalHalfRanges_();
  const h1Data = data.filter(function (p) { return isDateInRange_(p.invoiceDate, ranges.h1.start, ranges.h1.end); });
  const h2Data = data.filter(function (p) { return isDateInRange_(p.invoiceDate, ranges.h2.start, ranges.h2.end); });

  updateDashboardSheet_(SHEET_NAMES.DASHBOARD_CURRENT, '全体サマリー（現状・全期間）', '全期間（請求日を問わずすべての案件）', data);
  updateDashboardSheet_(
    SHEET_NAMES.DASHBOARD_H1,
    '上期サマリー',
    ranges.fiscalYearLabel + ' 上期（' + formatDate_(ranges.h1.start) + '〜' + formatDate_(ranges.h1.end) + '）',
    h1Data
  );
  updateDashboardSheet_(
    SHEET_NAMES.DASHBOARD_H2,
    '下期サマリー',
    ranges.fiscalYearLabel + ' 下期（' + formatDate_(ranges.h2.start) + '〜' + formatDate_(ranges.h2.end) + '）',
    h2Data
  );
}

/**
 * 初期状態で作られる既定のシート（Sheet1 / シート1）が
 * 他のシート作成後も残っている場合は削除する
 */
function deleteDefaultSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  ['Sheet1', 'シート1'].forEach(function (name) {
    const sheet = ss.getSheetByName(name);
    if (sheet && ss.getSheets().length > 1) {
      ss.deleteSheet(sheet);
    }
  });
}

/**
 * 旧バージョンで作られた「ダッシュボード」シートが残っている場合、
 * 「現状ダッシュボード」へリネームして引き継ぐ
 */
function migrateLegacyDashboardSheet_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const legacy = ss.getSheetByName('ダッシュボード');
  if (legacy && !ss.getSheetByName(SHEET_NAMES.DASHBOARD_CURRENT)) {
    legacy.setName(SHEET_NAMES.DASHBOARD_CURRENT);
  }
}

/**
 * 指定した名前のシートを取得し、存在しなければ新規作成する
 */
function getOrCreateSheet_(name) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(name);
  if (!sheet) {
    sheet = ss.insertSheet(name);
  }
  return sheet;
}

/**
 * 列ごとに幅（px）を指定して見やすく広げる
 */
function setColumnWidths_(sheet, widths) {
  widths.forEach(function (width, i) {
    sheet.setColumnWidth(i + 1, width);
  });
}
