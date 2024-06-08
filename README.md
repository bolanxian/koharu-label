# Koharu Label
将`标注文件`和`音高`组合为`Synthesizer V Studio`工程文件或`OpenUtau`工程文件。  


## 功能
- 输入
  - [NEUTRINO](https://studio-neutrino.com/) (`score/label/timing/*.lab`,`output/*.f0`)
  - [VOICEVOX](https://voicevox.hiroshiba.jp/) (打开 `labファイルを書き出し`)
  - 其他人声（使用 [vLabeler](https://github.com/sdercolin/vlabeler/) `Sinsy lab 标注器` 手动标注）
- 输出
  - Synthesizer V Studio
  - [OpenUtau](https://github.com/stakira/OpenUtau/)
  - [NEUTRINO](https://n3utrino.work/) ([TyouseiSienTool](https://github.com/sigprogramming/tyouseisientool/releases/))

- 请注意检查相关声库与软件的使用规则
- 在作品中使用时，推荐写上`调校协力：角色名(软件名)`
- 本工具仅做基本的处理，对于VOICEVOX，爆破音之前的元音可能提前结束，需注意修改（音素表见[此文章](https://www.bilibili.com/read/cv14176406)尾部[](https://i0.hdslb.com/bfs/article/4d91f86b7be624085a42f43b269585ed55458a04.jpg)）


## 关于 PyWORLD
[PyWORLD](https://github.com/JeremyCCHsu/Python-Wrapper-for-World-Vocoder/)是WORLD声码器的Python包装。  
[WORLD](https://github.com/mmorise/World/)是高质量语音分析、操作和合成系统。  
可以估计基频(F0)、频谱包络、非周期性指数，也可以仅使用估计参数合成语音。  


## [下载版](https://pan.baidu.com/s/1fJgz6Resv2gt_GJaLMw6Tw?pwd=khrr)
- 将`koharu-label.zip`和`koharu-label-runtime.zip`解压到同一目录
- 运行`run.bat`

**运行环境**
- Windows 10 x64
- 现代浏览器


## 构建
```batch
: 安装依赖
npm install

: 构建
npm run build

: 安装Python依赖
npm run requirements

: 启动
py -3 app.py
```