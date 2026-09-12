/**
 * シート名
 */
const SHEET_NAMES = {
  INPUT: '案件入力',
  MEMBERS: '担当者マスタ',
  PROJECT_SUMMARY: '案件別集計',
  MEMBER_SUMMARY: '担当者別集計',
  DASHBOARD: 'ダッシュボード',
};

/**
 * 「案件入力」シートのヘッダーと列番号（1始まり）
 */
const INPUT_HEADERS = [
  '案件No.', '案件名', '担当者', '状況',
  '売上（製作費予算）', '外注費',
  '人日単価', '稼働日数（人日）', '人件費',
  'その他原価（社内外注費）',
  '原価合計', '粗利益', '利益率',
  '請求日', '課題・備考',
];

const COL = {
  NO: 1,
  NAME: 2,
  OWNER: 3,
  STATUS: 4,
  REVENUE: 5,
  OUTSOURCE_COST: 6,
  DAILY_RATE: 7,
  WORK_DAYS: 8,
  LABOR_COST: 9,
  OTHER_COST: 10,
  TOTAL_COST: 11,
  GROSS_PROFIT: 12,
  MARGIN: 13,
  INVOICE_DATE: 14,
  NOTES: 15,
};

// 案件入力シートにあらかじめ数式・入力規則を用意しておく行数
const INPUT_TEMPLATE_ROWS = 200;

// 「案件入力」シートの列幅（px）。INPUT_HEADERS と同じ順番・同じ数で対応させる
const INPUT_COLUMN_WIDTHS = [90, 220, 110, 100, 150, 110, 100, 140, 100, 170, 110, 110, 90, 100, 240];

/**
 * 「担当者マスタ」シートのヘッダー
 */
const MEMBER_HEADERS = ['担当者名', '月間稼働可能日数'];

// 「担当者マスタ」シートの列幅（px）
const MEMBER_COLUMN_WIDTHS = [150, 160];

/**
 * 「案件別集計」シートのヘッダーと列幅（px）
 */
const PROJECT_SUMMARY_HEADERS = ['案件No.', '案件名', '担当者', '状況', '売上', '原価合計', '粗利益', '利益率', '要注意'];
const PROJECT_SUMMARY_COLUMN_WIDTHS = [90, 220, 110, 100, 120, 120, 120, 90, 120];

/**
 * 「担当者別集計」シートのヘッダーと列幅（px）
 */
const MEMBER_SUMMARY_HEADERS = [
  '担当者', '案件数', '売上合計', '粗利益合計', '平均利益率',
  '稼働日数合計', '月間稼働可能日数', '稼働率', '要注意案件数', '状態',
];
const MEMBER_SUMMARY_COLUMN_WIDTHS = [120, 90, 130, 130, 110, 130, 150, 100, 120, 220];

// 「ダッシュボード」シートの列幅（px）：A列・B列
const DASHBOARD_COLUMN_WIDTHS = [140, 160];

/**
 * 状況の選択肢
 */
const STATUS_OPTIONS = ['進行中', '完了', '保留', '要注意'];

/**
 * 要注意判定・稼働率のしきい値
 */
const LOW_MARGIN_THRESHOLD = 0.15; // 利益率がこれ未満の案件は要注意
const OVERLOAD_THRESHOLD = 1.0; // 稼働率がこれを超えたら要注意（100%超）
const AT_RISK_RATIO_THRESHOLD = 0.5; // 担当案件のうち要注意案件がこの割合以上なら「低利益率案件が多い」
const DEFAULT_MONTHLY_CAPACITY_DAYS = 20; // 担当者マスタに未登録の場合のデフォルト月間稼働可能日数

const HEADER_BACKGROUND = '#4a86e8';
const HEADER_FONT_COLOR = '#ffffff';
const RISK_BACKGROUND = '#f4cccc';
