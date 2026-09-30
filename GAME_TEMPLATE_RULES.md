# GAME_TEMPLATE_RULES.md

## Workspace 與遊戲界線

1. `012s小遊戲` 是共用 Workspace；新遊戲位於 `games/<game-id>/`，每款遊戲都是可單獨啟動、測試、Build、部署的前端專案。
2. 新遊戲必須從 `game-template/` 建立。只修改目標遊戲，不要無關修改其他遊戲。
3. 真正跨遊戲能力優先放在 `shared/`；玩法、關卡、敵人 AI、計分與遊戲專屬 UI 留在遊戲本身。
4. 非工程人員可修改遊戲自己的 `config/game_config.xlsx`；驗證並轉成 JSON，Runtime 只讀 JSON。
5. 素材放在該遊戲自己的 `assets/`；Excel 只填檔名或相對於素材類別的路徑，程式依 category 找路徑。
6. 支援手機 viewport、安全區域與至少 44×44px 觸控目標，不依賴 hover。
7. 提供繁體中文 README、ASSETS_GUIDE、版本資訊、Debug、`012s:gameStart` 與 `012s:gameComplete` 事件。
8. Build 產物可以部署在子目錄；完成後不得依賴 workspace 的 shared、tools、template、其他遊戲或絕對路徑。
9. 不得硬編碼目前 Workspace 實際路徑 `D:\Desktop\012s小遊戲` 或任何本機絕對路徑。測試不自動 Push。

## Legacy 保護

- Workspace 初始化預設採 Non-destructive。
- 根目錄可能有 Legacy Project；未經使用者批准，不得刪除、移動、改名、重構、覆蓋或自動搬入 `games/`。
- 新架構工具預設只管理 `games/` 中的新架構遊戲。
- Legacy 遷移採 Copy First / Verify First / Retire Later；新副本驗收前保留原專案。
- Legacy 專案若有自己的 `.git`，不得自動修改其 Git 設定。
- 不知道用途的既有資料夾一律不動。

