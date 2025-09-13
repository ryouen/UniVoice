/**
 * CSS Modules の型定義
 * .module.css ファイルをTypeScriptで正しく認識させるための宣言
 */
declare module '*.module.css' {
  const classes: { [key: string]: string };
  export default classes;
}

declare module '*.module.scss' {
  const classes: { [key: string]: string };
  export default classes;
}