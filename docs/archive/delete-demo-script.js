const demoClassesToRemove = [
    "機械学習基礎",
    "データ構造とアルゴリズム",
    "ソフトウェア工学",
    "人工知能概論",
    "システム設計"
];

const currentClassesJSON = localStorage.getItem('recentClasses');
let currentClasses = currentClassesJSON ? JSON.parse(currentClassesJSON) : [];

const updatedClasses = currentClasses.filter(className => !demoClassesToRemove.includes(className));

localStorage.setItem('recentClasses', JSON.stringify(updatedClasses));

console.log("デモ授業のデータを削除しました。");
console.log("更新後の授業リスト:", updatedClasses);