# 素材指南

- 圖片放 `assets/images/` 的分類資料夾：characters、enemies、items、backgrounds、ui、effects、targets、distractors。
- 音效放 `assets/audio/sfx/`，背景音樂放 `assets/audio/bgm/`。
- Spritesheet 放 `assets/animations/`。
- 同檔名替換素材不需改程式；換新檔名則更新 XLSX 的 Assets 或 Audio Sheet。
- 支援 PNG、JPEG、WebP、SVG 圖片；音訊建議 MP3、OGG、WAV。
- 建議 UI 圖片使用 2x 尺寸並保留足夠透明留白；角色圖片使用透明 PNG/WebP。
- Excel 填檔名或相對素材分類的路徑，勿輸入電腦絕對路徑。
- 常見錯誤：檔名大小寫不符、XLSX 路徑與實際分類不同、忘記將素材加入專案、未重新產生 JSON。

## 商品圖與色環

- 目前 8 張商品圖以透明 WebP 載入，維持 1024×1024、品質 90。PNG 原檔仍保留供後續編輯，但遊戲設定指向 `.webp`；轉換後記得同步更新 Excel 的所有同商品引用。8 張總大小由 6,245,060 bytes 降為 1,056,862 bytes（約減少 83%）。

- 商品透明 PNG 放在 `assets/images/targets/`，保留原檔名即可；後續可繼續加入。
- PNG、JPEG、WebP 在刺激與規則提示中保留原色；既有 SVG 幾何圖形維持中性色。色環由 `Stimuli.type` 決定，與商品圖片本身的顏色無關。
- 放入圖片不會自動改變關卡。需在 `config/game_config.xlsx` 的 Assets 登記 `category=target` 與檔名，再由 Stimuli 的 image 指向該 Assets.id。
- 同一商品可有不同色環：建立多筆 Stimuli，保持相同 image 與 shape（商品識別碼），分別指定不同 type。id 必須各自唯一。
- 商品替換原本的幾何圖形時，需同步更新 shape 與 Rules 的 targetShape / forbiddenShape，以及規則中文描述。不能只換圖片，卻仍讓提示稱它為三角形。
- 完成設定後執行 `npm run build`，驗證並產生遊戲設定與素材輸出。

## 背景水母

- 素材放在 `assets/images/distractors/`；目前使用 `jellyfish.webp`（透明背景、768×768、品質 90，約 93 KB），原始 `水母.png` 保留。
- Excel 的 Assets 中，`id=noise`、`category=distractor` 指向 `jellyfish.webp`。更換素材後執行 `npm run build`。
- 水母以等比例置中的大圖出現在遊戲區背景，商品與色環位於前景，不參與商品的位置判定。
- 背景透明度由 `src/style.css` 的 `--distractor-background-opacity` 控制，目前為 0.32。規則辨識圖維持原圖清晰顯示。
