
//from https://gist.github.com/so-c/3f92609556d7d5aa443bbb1e3b3c66d1
//video https://www.nicovideo.jp/watch/sm38322727

// hiragana: 日本語ひらがな文字列
// returns:
//    スペース区切りの中国語音素文字列
//
// references: https://twitter.com/shizumu96/status/1362542581645672453
//
const hiragana2ChinesePronounceMap = {
  // あ行
  "あ": "a",
  "い": "i",
  "うぉ": "w o",
  "う": "i\\",
  "え": "e",
  "お": "uo",
  // か行
  "か": "kh a",
  "きゃ": "kh j a",
  "きゅ": "kh j i\\",
  "きょ": "kh j uo",
  "き": "kh i",
  "く": "kh i\\",
  "け": "kh e",
  "こ": "kh uo",
  // さ行
  "さ": "s a",
  "しゃ": "s\\ a",
  "しゅ": "s\\ i\\",
  "しぇ": "s\\ e",
  "しょ": "s\\ uo",
  "し": "s\\ i",
  "す": "s i\\",
  "せ": "s e",
  "そ": "s uo",
  // た行
  "た": "th a",
  "ちゃ": "ts\\h a",
  "ちゅ": "ts\\h i\\",
  "ちぇ": "ts\\h e",
  "ちょ": "ts\\h uo",
  "ち": "ts\\h i",
  "つ": "tsh i\\",
  "てぃ": "th i",
  "て": "th e",
  "と": "th uo",
  // な行
  "な": "n a",
  "にゃ": "n j a",
  "にゅ": "n j i\\",
  "にょ": "n j uo",
  "に": "n i",
  "ぬ": "n i\\",
  "ね": "n e",
  "の": "n uo",
  // は行
  "は": "x a",
  "ひゃ": "x j a",
  "ひゅ": "x j i\\",
  "ひょ": "x j uo",
  "ひ": "x i",
  "ふぁ": "f a",
  "ふぃ": "f i",
  "ふぇ": "f e",
  "ふぉ": "f o",
  "ふ": "x i\\",
  "へ": "x e",
  "ほ": "x uo",
  // ま行
  "ま": "m a",
  "みゃ": "m j a",
  "みゅ": "m j i\\",
  "みょ": "m j uo",
  "み": "m i",
  "む": "m i\\",
  "め": "m e",
  "も": "m uo",
  // や行
  "や": "j ia",
  "ゆ": "j i\\",
  "いぇ": "j e",
  "よ": "j uo",
  // ら行
  "ら": "l a",
  "りゃ": "l j a",
  "りゅ": "l j i\\",
  "りょ": "l j uo",
  "り": "l i",
  "る": "l i\\",
  "れ": "l e",
  "ろ": "l uo",
  // わ行
  "わ": "w a",
  "を": "o",
  "ん": ":n",
  // 濁音
  // が行
  "が鼻": "N a",
  "が": "k a",
  "ぎ鼻": "N i",
  "ぎゃ": "k j a",
  "ぎゅ": "k j i\\",
  "ぎょ": "k j uo",
  "ぎ": "k i",
  "ぐ鼻": "N i\\",
  "ぐ": "k i\\",
  "げ鼻": "N e",
  "げ": "k e",
  "ご鼻": "N uo",
  "ご": "k uo",
  // ざ行
  "ざ": "ts a",
  "じゃ": "ts\\ a",
  "じゅ": "ts\\ i\\",
  "じぇ": "ts\\ e",
  "じょ": "ts\\ uo",
  "じ": "ts i",
  "ず": "ts i\\",
  "ぜ": "ts e",
  "ぞ": "ts uo",
  // だ行
  "だ": "t a",
  // FIXME:「じ」のコピペ
  "ぢゃ": "ts\\ a",
  "ぢゅ": "ts\\ i\\",
  "ぢょ": "ts\\ uo",
  "ぢ": "ts i",
  "づ": "ts i\\",  // 「ず」と同じ
  "でぃ": "t i",
  "で": "t e",
  "ど": "t uo",
  // ば行
  "ば": "p a",
  "びゃ": "p j a",
  "びゅ": "p j i\\",
  "びょ": "p j uo",
  "び": "p i",
  "ぶ": "p i\\",
  "べ": "p e",
  "ぼ": "p uo",
  // 半濁音
  // ぱ行
  "ぱ": "ph a",
  "ぴゃ": "ph j a",
  "ぴゅ": "ph j i\\",
  "ぴょ": "ph j uo",
  "ぴ": "ph i",
  "ぷ": "ph i\\",
  "ぺ": "ph e",
  "ぽ": "ph uo",
  // 促音
  "っ": "cl"
}
export function* hiragana2ChinesePronounceGen(str: string, map?: Record<string, string>) {
  map = map != null ? map : hiragana2ChinesePronounceMap
  let i
  for (i = 0; i < str.length; i++) {
    const cur = str[i], next = str[i + 1]
    const res = map[cur + next] || map[cur]
    if (res != null) { yield res }
  }
}
export const hiragana2ChinesePronounce = (str: string, map?: Record<string, string>) => {
  return Array.from(hiragana2ChinesePronounceGen(str, map)).join(" ")
}
hiragana2ChinesePronounce.map = hiragana2ChinesePronounceMap
hiragana2ChinesePronounce.gen = hiragana2ChinesePronounceGen
export default hiragana2ChinesePronounce