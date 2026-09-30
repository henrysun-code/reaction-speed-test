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

- 商品透明 PNG 放在 `assets/images/targets/`，保留原檔名即可；後續可繼續加入。
- PNG、JPEG、WebP 在刺激與規則提示中保留原色；既有 SVG 幾何圖形維持中性色。色環由 `Stimuli.type` 決定，與商品圖片本身的顏色無關。
- 放入圖片不會自動改變關卡。需在 `config/game_config.xlsx` 的 Assets 登記 `category=target` 與檔名，再由 Stimuli 的 image 指向該 Assets.id。
- 同一商品可有不同色環：建立多筆 Stimuli，保持相同 image 與 shape（商品識別碼），分別指定不同 type。id 必須各自唯一。
- 商品替換原本的幾何圖形時，需同步更新 shape 與 Rules 的 targetShape / forbiddenShape，以及規則中文描述。不能只換圖片，卻仍讓提示稱它為三角形。
- 完成設定後執行 `npm run build`，驗證並產生遊戲設定與素材輸出。
