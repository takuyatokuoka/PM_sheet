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
 */
function setupAll() {
  setupInputSheet();
  setupMemberSheet();
  setupProjectSummarySheet();
  setupMemberSummarySheet();
  setupDashboardSheet();
  updateAllSummaries();
  deleteDefaultSheet_();

  SpreadsheetApp.getUi().alert(
    'セットアップが完了しました。\n' +
    '「' + SHEET_NAMES.INPUT + '」シートに案件データを入力し、\n' +
    'メニューの「案件管理」→「② 集計を更新」を実行してください。'
  );
}

/**
 * 案件入力データをもとに、案件別集計・担当者別集計・ダッシュボードを再計算する
 */
function updateAllSummaries() {
  const data = getInputData_();
  updateProjectSummary_(data);
  updateMemberSummary_(data);
  updateDashboard_(data);
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
