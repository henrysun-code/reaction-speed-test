export function validateConfig(config, gameId = 'unknown') {
  const errors = [];
  for (const sheet of ['GameSettings', 'Assets', 'Animations', 'Audio', 'Text']) {
    if (!Array.isArray(config[sheet])) errors.push(`[${gameId}] Sheet ${sheet}: 必須是表格資料`);
  }
  const unique = (rows, sheet, key = 'id') => {
    const seen = new Set();
    for (const [i, row] of (rows || []).entries()) {
      const value = row[key]; if (!value) continue;
      if (seen.has(value)) errors.push(`[${gameId}] Sheet ${sheet} Row ${i + 2} Column ${key}: 重複 ID ${value}`);
      seen.add(value);
    }
  };
  const settingKeys = new Set();
  for (const [i, row] of (config.GameSettings || []).entries()) {
    if (!row.key || row.value === undefined || row.value === '') errors.push(`[${gameId}] Sheet GameSettings Row ${i + 2} Column key/value: 必填`);
    if (settingKeys.has(row.key)) errors.push(`[${gameId}] Sheet GameSettings Row ${i + 2} Column key: 重複 ID ${row.key}`);
    settingKeys.add(row.key);
  }
  for (const key of ['gameId','gameName','gameVersion']) if (!settingKeys.has(key)) errors.push(`[${gameId}] Sheet GameSettings Column key: 缺少 ${key}`);
  unique(config.Assets, 'Assets'); unique(config.Animations, 'Animations'); unique(config.Audio, 'Audio'); unique(config.Text, 'Text', 'key');
  const categories = ['target','distractor','character','enemy','item','background','ui','effect','animation'];
  for (const [i, row] of (config.Assets || []).entries()) {
    if (!row.id || !row.file || !row.category) errors.push(`[${gameId}] Sheet Assets Row ${i + 2} Column id/category/file: 必填`);
    if (row.category && !categories.includes(row.category)) errors.push(`[${gameId}] Sheet Assets Row ${i + 2} Column category: 不支援 ${row.category}`);
    if (!['TRUE','FALSE'].includes(String(row.enabled).toUpperCase())) errors.push(`[${gameId}] Sheet Assets Row ${i + 2} Column enabled: 僅接受 TRUE/FALSE`);
  }
  for (const [i, row] of (config.Animations || []).entries()) {
    for (const key of ['image','frameWidth','frameHeight','frameCount','fps','playMode']) if (row[key] === '' || row[key] === undefined) errors.push(`[${gameId}] Sheet Animations Row ${i + 2} Column ${key}: 必填`);
    for (const key of ['frameWidth','frameHeight','frameCount','fps']) if (!(Number(row[key]) > 0)) errors.push(`[${gameId}] Sheet Animations Row ${i + 2} Column ${key}: 必須是大於 0 的數字`);
    if (row.playMode && !['once','loop','pingpong'].includes(row.playMode)) errors.push(`[${gameId}] Sheet Animations Row ${i + 2} Column playMode: 不支援 ${row.playMode}`);
    if (!['TRUE','FALSE'].includes(String(row.loop).toUpperCase())) errors.push(`[${gameId}] Sheet Animations Row ${i + 2} Column loop: 僅接受 TRUE/FALSE`);
  }
  for (const [i, row] of (config.Audio || []).entries()) {
    if (!row.id || !row.file || !row.category) errors.push(`[${gameId}] Sheet Audio Row ${i + 2} Column id/category/file: 必填`);
    if (row.category && !['sfx','bgm'].includes(row.category)) errors.push(`[${gameId}] Sheet Audio Row ${i + 2} Column category: 不支援 ${row.category}`);
    if (!(Number(row.volume) >= 0) || Number(row.volume) > 1) errors.push(`[${gameId}] Sheet Audio Row ${i + 2} Column volume: 必須介於 0 和 1`);
    if (!['TRUE','FALSE'].includes(String(row.loop).toUpperCase())) errors.push(`[${gameId}] Sheet Audio Row ${i + 2} Column loop: 僅接受 TRUE/FALSE`);
    if (!['TRUE','FALSE'].includes(String(row.enabled).toUpperCase())) errors.push(`[${gameId}] Sheet Audio Row ${i + 2} Column enabled: 僅接受 TRUE/FALSE`);
  }
  for (const [i, row] of (config.Text || []).entries()) if (!row.key || row.text === '' || row.text === undefined) errors.push(`[${gameId}] Sheet Text Row ${i + 2} Column key/text: 必填`);
  return errors;
}
