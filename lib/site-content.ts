import { FilePen, MessageCircle, ShieldAlert, Trophy } from "lucide-react";
import type { LucideIcon } from "lucide-react";

export const HERO_SUPPORTS: Array<{
  icon: LucideIcon;
  title: string;
}> = [
  { icon: Trophy, title: "補助金の自動抽出" },
  { icon: FilePen, title: "採択される事業計画書" },
  { icon: ShieldAlert, title: "重複チェック＆管理" },
  { icon: MessageCircle, title: "AIマイスターにチャット相談" },
];

export const FEATURE_DETAILS = [
  {
    title: "補助金の自動抽出",
    body: "地域・業種・事業メモから、持続化補助金やIT導入補助金など、メイン制度に加えて併用できる候補を整理します。取りこぼしやすい自治体独自支援の確認ポイントも提示します。",
  },
  {
    title: "採択される事業計画書",
    body: "審査員が読みやすい見出しで、強み・課題・取組・効果まで下書きします。プレミアムでは各章の詳細と、品目ごとの精緻な経費テーブルまで出力します。",
  },
  {
    title: "重複チェック＆管理",
    body: "同じ経費・物品を複数制度へ重ねていないかをマイページの申請履歴で確認できます。過去の計画と品目が重なる場合は、重複リスクとして通知します。",
  },
  {
    title: "AIマイスターにチャット相談",
    body: "生成した地域・業種・事業計画を前提に、右下のチャットから気になる点を質問できます。「この町の独自補助金は？」「この表現で大丈夫？」など、短いやり取りで確認できます。",
  },
] as const;

export const PLAN_FEATURES = [
  { label: "骨子サマリー", free: true, premium: true },
  { label: "簡易計画書", free: true, premium: true },
  { label: "基本アドバイス", free: true, premium: true },
  { label: "完全版事業計画書（各章詳細）", free: false, premium: true },
  { label: "精緻な経費テーブル", free: false, premium: true },
  { label: "個別AIチャット相談", free: false, premium: true },
  { label: "マイページ重複管理", free: false, premium: true },
] as const;

export const PRICING_PLANS = [
  {
    name: "無料版",
    price: "¥0",
    note: "お試し",
    points: ["骨子サマリー", "簡易計画書", "基本アドバイス"],
    featured: false,
  },
  {
    name: "プレミアム",
    price: "¥980",
    note: "税込〜 / 1回",
    points: [
      "完全版事業計画書",
      "精緻な経費テーブル",
      "個別AIチャット相談",
      "マイページ重複管理",
    ],
    featured: true,
  },
] as const;

export const FAQS = [
  {
    q: "申請の代行をお願いできますか？",
    a: "できません。本サービスは文章構成と事業計画のアイデア作成を支援するアシスタントです。官公署等への提出書類の作成代行（行政書士法に定める業務）ではありません。",
  },
  {
    q: "無料版とプレミアム版の違いは？",
    a: "無料版は骨子サマリー・簡易計画書・基本アドバイスです。プレミアム版では完全版の事業計画書、精緻な経費テーブル、個別AIチャット相談、マイページでの重複管理が利用できます。",
  },
  {
    q: "個別AIチャット相談とは？",
    a: "生成した地域・業種・事業計画を前提に、「この町の独自補助金は？」「この表現で大丈夫？」などと質問できる相談機能です。プレミアム版で利用できます。",
  },
  {
    q: "マイページには何が保存されますか？",
    a: "生成した申請計画の履歴です。同じ経費や物品が複数の計画に重なっていないかを一覧で確認できます。データはこの端末のブラウザ内に保存されます。",
  },
  {
    q: "生成結果はそのまま提出できますか？",
    a: "下書きです。制度要領・公募要領・最新の様式に照らして、数値や事実関係をご自身で確認・修正したうえでご利用ください。",
  },
  {
    q: "決済後のキャンセルはできますか？",
    a: "デジタルコンテンツの特性上、決済完了後の返金・キャンセルはお受けできません。詳細は特定商取引法に基づく表記をご確認ください。",
  },
] as const;
