# 最終瀏覽器驗收（2026-09-30）

沿用既有專案，只完成剩餘驗收及必要修正。測試使用本機 Vite、無頭 Microsoft Edge，以及 Playwright 的原生觸控與滑鼠操作。

| 項目 | 結果 | 證據 |
| --- | --- | --- |
| 1. 實際進入遊戲 | PASS | 從關卡選單進入 Level 1 並開始倒數、遊玩 |
| 2. 實際完成一關 | PASS | 使用 Excel 預設，完整完成 18 次刺激，無 Runtime Override |
| 3. 正確點擊 | PASS | 2 次正確目標點擊，分別使用觸控與滑鼠，反應時間大於 0 且小於停留時間 |
| 4. 誤點 | PASS | 實際點擊非目標，Trial 與結算記錄 False Alarm |
| 5. 漏點 | PASS | 實際略過目標，Trial 與結算記錄 Miss |
| 6. 結算畫面 | PASS | 顯示計數與成績；獨立核對平均、中位數、標準差，排除誤點與漏點 |
| 7. 下一關 | PASS | 從 Level 1 結算前往 Level 2 棕色目標規則頁 |
| 8. 歷史紀錄 | PASS | 歷史頁顯示本次結果 |
| 9. 重新整理後歷史存在 | PASS | 重新整理後同一筆日期與成績仍存在 |
| 10. Infinite Mode 連續進行 | PASS | 連續完成 infinite-1、infinite-2，各 6 次刺激（Runtime Override），兩份結果及歷史；每關都有可點擊 Trial |
| 11. Developer Settings / Debug Mode | PASS | 一般入口隱藏設定；?debug=1 可直接指定 brown 規則，6 次刺激、300 ms 間隔、600 ms 停留、取消倒數皆生效 |
| 12. 最後 Build | PASS | Workspace scripts/build_game.bat 選擇 reaction-speed-test，Excel/素材檢查、TypeScript、Vite 全部成功，exit code 0 |

另確認 320 px 歷史頁無水平溢出。最終無限模式驗收無瀏覽器執行錯誤或素材請求失敗。

## 必要修正

共用 InputManager 的 pointer 資料展開會將 detail.type 的事件名稱覆蓋成 mouse/touch/pen，遊戲因而無法辨識 pointerdown。新增本遊戲的 src/game/input.ts 相容處理：以 capture 保留原事件名稱，再由既有 InputManager 處理輸入、鎖定、鍵盤及可見性。沒有修改 shared 或其他遊戲。

驗收腳本另修正結算切換時分開讀取 DOM 造成的競態。該次無限第一關已正常結算；修正腳本後僅重跑無限模式剩餘驗收。

## 證據檔案

- artifacts/final-result-mobile.png：預設關卡結算。
- artifacts/final-history-320.png：320 px 歷史頁。
- artifacts/final-infinite-result.png：無限模式第二關結算。
- artifacts/final-acceptance.json：最後單獨執行的無限模式驗收記錄。
- browser.mjs：完整瀏覽器驗收腳本；INFINITE_ONLY=1 可只執行連續無限模式。

Build 產物：Workspace 的 dist/reaction-speed-test/。本次未 Commit 或 Push。觸控驗收使用瀏覽器模擬，未使用實體手機。
