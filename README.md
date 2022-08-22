# Koharu Label
将`发声时机`和`音高`组合为`Synthesizer V Studio`工程文件。  


## 功能
- 输入
  - [NEUTRINO](https://n3utrino.work/) (`score/label/timing/*.lab`,`output/*.f0`)
  - [VOICEVOX](https://voicevox.hiroshiba.jp/) (打开 `labファイルを書き出し`)
  - 其他人声（手动测量发声时机）
- 输出
  - Synthesizer V Studio
  - [NEUTRINO](https://n3utrino.work/) (svp->Midi->MusicXML)
  
- 请注意检查相关（声音或软件）的使用规则
- 在作品中使用时，推荐写上`调校协力：角色名(软件名)`
- 本工具仅做基本的处理，对于VOICEVOX，存在特定元音提前结束的现象，需注意修改


## 关于 PyWORLD
[PyWORLD](https://github.com/JeremyCCHsu/Python-Wrapper-for-World-Vocoder/)是WORLD声码器的Python包装。  
[WORLD](https://github.com/mmorise/World)是高质量语音分析、操作和合成系统。  
可以估计基频(F0)、频谱包络、非周期性指数，也可以仅使用估计参数合成语音。  


## [下载版](https://pan.baidu.com/s/1fJgz6Resv2gt_GJaLMw6Tw?pwd=khrr)
- 将`koharu-label.7z`和`koharu-label-runtime.7z`解压到同一目录
- 运行`run.bat`

**运行环境**
- Windows 10 x64
- 现代浏览器


## 构建
```batch
:安装依赖
npm install

:构建
npm run build

:安装Python依赖
npm run requirements

:启动
py -3 app.py
```