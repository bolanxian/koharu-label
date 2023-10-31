
import Main from '../koharu-label/main.vue'
import Syncer from '../koharu-label/syncer.vue'
import Lyric from '../lyric-transfer/main.vue'
export { Main, Syncer, Lyric }

export type Module = ReturnType<typeof getModule>
export const getModule = (hash = location.hash) => {
  switch (hash) {
    case '': return Main
    case '#syncer': return Syncer
    case '#lyric': return Lyric
  }
  return null
}
