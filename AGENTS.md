# AGENTS.md

## 012s Workspace 指引

開始任何遊戲新增或修改前，先閱讀 `GAME_TEMPLATE_RULES.md` 及該遊戲的 `games/<game-id>/README.md`。新增遊戲一律使用 `game-template/`，放在 `games/<game-id>/`。

修改一款遊戲時只改該遊戲；需要共用能力時先檢查 `shared/`，修改前評估所有遊戲的影響並做回歸檢查。共用工具只管理 `games/` 下符合新架構的遊戲。

根目錄 `games/` 以外的既有專案皆視為 Legacy。未經明確要求，不得移動、刪除、改名、重構、覆蓋或自動搬入 `games/`。Legacy 修改前先建立 Migration Plan。Legacy 自有 `.git` 時不得自動更動其 Git 設定。未知用途的資料一律保留。

不得在程式或設定硬編碼目前 Workspace 實際路徑 `D:\Desktop\012s小遊戲` 或任何其他本機絕對路徑。使用相對路徑與檔案位置計算方式，確保 Workspace 可搬家。測試時不自動 Commit 或 Push。

