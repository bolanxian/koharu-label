## Koharu Label
将发声时机和音高组合为 Synthesizer V Studio 工程文件。

### 从 NEUTRINO
`NEUTRINO/score/label/timing/*.lab`  
`NEUTRINO/output/*.f0`  
### 从 VOICEVOX
首先在 设置＞保存 打开 `labファイルを書き出し`  

### PyWORLD
PyWORLD是WORLD声码器的Python包装  
使用WORLD声码器可从语音中提取声学特征，包括基频、频谱包络、非周期性指数  
WORLD声码器提供了 `DIO` 和 `Harvest` 两个基频估计方法  
在本页面控制台执行 `options.useHarvest=true` 可切换为 `Harvest`  

### [唱歌VOICEVOX](/?syncer)