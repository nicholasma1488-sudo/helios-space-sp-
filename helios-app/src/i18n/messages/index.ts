import type { Language } from '../index'
import * as common from './common'
import * as shell from './shell'
import * as home from './home'
import * as profile from './profile'
import * as helios from './helios'
import * as feed from './feed'
import * as chat from './chat'
import * as auth from './auth'
import * as apps from './apps'
import * as workspaces from './workspaces'

export type Dict = Record<string, string>

/**
 * Translations are split by product area so the files stay reviewable; every
 * area exports a `zhCN` and a `zhTW` dictionary keyed by the English source
 * string. Later areas win on duplicate keys, so put shared vocabulary in
 * `common` and keep area files to their own screens.
 */
const AREAS = [common, shell, home, profile, helios, feed, chat, auth, apps, workspaces]

function merge(pick: (area: { zhCN: Dict; zhTW: Dict }) => Dict): Dict {
  return Object.assign({}, ...AREAS.map(pick))
}

export const MESSAGES: Record<Exclude<Language, 'en'>, Dict> = {
  'zh-CN': merge(area => area.zhCN),
  'zh-TW': merge(area => area.zhTW),
}
