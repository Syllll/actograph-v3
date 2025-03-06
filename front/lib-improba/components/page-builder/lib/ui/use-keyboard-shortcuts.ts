import { onMounted, onUnmounted, reactive, watch } from 'vue'
import { useTree } from '../tree'
import { useDrawers } from './use-drawers'
import { useRoute } from 'vue-router'
import { EOrigins, ESpecialKeys, ICombinaison, IShortcut, TOriginPaths } from './interfaces/keyboard-shortcuts.interface'

const sharedState = reactive({
  altMode: false,
  customShortcuts: [] as IShortcut[],
  // active: true,
})

export const useKeyboardShortcuts = (myTreeId: string, params: { listen?: boolean, iframe?: boolean } = { listen: true }) => {
  const route = useRoute()
  const drawers = useDrawers(myTreeId)
  const tree = useTree(myTreeId)
  const treeState = tree.sharedState

  const wording = {
    // ? #region KEYWORDS
    HUD: 'HUD',
    node: 'node',
    drawer: 'drawer',
    altMode: 'altMode',
    // #endregion

    // ? #region TIME RELATED STUFF
    previous: 'previous',
    current: 'current',
    final: 'final',
    // #endregion

    // ? #region POSITIONS
    both: 'both',
    left: 'left',
    right: 'right',
    // #endregion

    // ? #region ACTIONS
    open: 'Open',
    show: 'Show',
    hide: 'Hide',
    loose: 'Loose',
    toggle: 'Toggle',
    display: 'Display',
    preview: 'Preview',
    // #endregion

    // ? #region TARGETS
    sticky: 'sticky',
    active: 'active',
    render: 'render',
    // #endregion

    // ? #region STATES
    state: 'state',
    focus: 'focus',
    focused: 'focused',
    selected: 'selected',
    // #endregion

    // ? #region STYLE STUFF
    outline: 'outline',
    border: 'border',
    // #endregion

    // ? #region DRAWERS TABS
    tab: 'tab',
    drawers: {
      global: 'Global',
      element: 'Element',
      library: 'Bibliotheque'
    },
    // #endregion
  }

  const state = reactive({
    // altModeTimeout: null as typeof setTimeout,
    altModeTimeout: null as any,
    altModeCombinaison: {
      key: 'k',
      specialKeys: ['ctrlKey', 'metaKey']
    } as ICombinaison
  })

  const stateless = {
    // ? #region ROUTE ORIGIN VALIDATION
    originPaths: {
      [EOrigins.cmsEditor]: [
        'cms_editor_page',
      ],
      [EOrigins.test]: [
        'aze'
      ]
    } as TOriginPaths,
    // #endregion

    // ? #region PLACEHOLDERS
    keyPlaceholders: {
      escape: 'Escape',
      ' ': 'Space',
      metaKey: '⌘',
      ctrlKey: 'Ctrl'
    } as any,
    // #endregion

    // ? #region SHORTCUTS
    shortcuts: [
      {
        description: `${wording.loose} ${wording.focus} on the ${wording.selected} ${wording.node}`,
        origin: 'cmsEditor',

        combinaisons: [
          { key: 'escape' }
        ],

        condition: () => treeState.selected,
        // || treeState.softSelected,
        action: () => {
          // if (treeState.selected) {
            // treeState.softSelected = treeState.softSelected
            treeState.selected = null
          // } else {
            // treeState.softSelected = null
          // }
          drawers.methods.toggleDrawerState('show', null, false)
        }
      },
      {
        description: `${wording.hide} ${wording.both} ${wording.drawer}s.`,
        origin: 'cmsEditor',

        combinaisons: [
          { key: 'escape' }
        ],

        condition: () => !treeState.selected && (drawers.sharedState.left.show || drawers.sharedState.right.show),
        action: () => drawers.methods.toggleDrawerState('show', null, false)
      },
      {
        description: `${wording.toggle} the ${wording.display} ${wording.state} of the ${wording.HUD} when no ${wording.node} is ${wording.selected}.`,
        origin: 'cmsEditor',

        combinaisons: [
          { key: ' ', specialKeys: ['ctrlKey', 'metaKey'] },
        ],

        condition: () => !treeState.selected,
        action: () => drawers.methods.toggleDrawerState('show')
      },
      {
        description: `${wording.toggle} the ${wording.display} ${wording.state} of the ${wording.left} ${wording.drawer}.`,
        origin: 'cmsEditor',

        combinaisons: [
          { key: 'b', specialKeys: ['ctrlKey', 'metaKey']}
        ],

        action: () => drawers.methods.toggleDrawerState('show', 'left'),
      },
      {
        description: `${wording.toggle} the ${wording.display} ${wording.state} of the ${wording.right} ${wording.drawer}.`,
        origin: 'cmsEditor',

        combinaisons: [
          { key: 'b', specialKeys: ['ctrlKey', 'metaKey'], altMode: true }
        ],

        action: () => drawers.methods.toggleDrawerState('show', 'right'),
      },
      {
        description: `Copy the ${wording.selected} ${wording.node}`,
        origin: 'cmsEditor',
        bypassPreventDefault: true,

        combinaisons: [
          { key: 'c', specialKeys: ['ctrlKey', 'metaKey'] }
        ],

        condition: () => treeState.selected,
        action: () => treeState.copiedNode = treeState.selected
      },
      {
        description: `${wording.toggle} ${wording.altMode}`,
        origin: 'cmsEditor',

        combinaisons: [
          state.altModeCombinaison
        ],
        preserveAltMode: true,

        condition: () => !sharedState.altMode,
        action: () => {
          sharedState.altMode = true
          state.altModeTimeout = setTimeout(() => {
            sharedState.altMode = false
          }, 1000)
        }
      },
      // {
      //   description: `${wording.toggle} ${wording.altMode}`,
      //   origin: 'cmsEditor',

      //   combinaisons: [
      //     state.altModeCombinaison
      //   ],
      //   preserveAltMode: true,

      //   condition: () => state.altMode,
      //   action: () => clearTimeout(state.altModeTimeout)
      // },
      {
        description: `${wording.toggle} the ${wording.sticky} ${wording.state} of ${wording.both} ${wording.drawer}s`,
        origin: 'cmsEditor',

        combinaisons: [
          { key: 's', specialKeys: ['ctrlKey', 'metaKey'], altMode: true }
        ],

        action: () => drawers.methods.toggleDrawerState('sticky')
      },
      {
        description: `${wording.preview} the ${wording.final} ${wording.render}`,
        origin: 'cmsEditor',

        combinaisons: [
          { key: '@' },
          { key: 'p', specialKeys: ['ctrlKey', 'metaKey'] },
        ],

        action: () => {
          drawers.methods.toggleDrawerState('show', null, false)
          treeState.readonly = !treeState.readonly
        }
      },
      {
        description: `${wording.display} ${wording.node}s ${wording.outline}.`,
        origin: 'cmsEditor',
        type: 'passive',

        combinaisons: [
          { key: '', specialKeys: ['metaKey'] }
        ],

        keydown: () => treeState.outline = true,
        keyup: () => treeState.outline = false
      }
    ] as IShortcut[]
    // #endregion
  }

  const methods = {
    allowOrigin (shortcut: IShortcut) {
      if (shortcut.origin === 'global' || params.iframe) { return true }

      const possibleRoutes = stateless.originPaths[shortcut.origin]
      return possibleRoutes.includes(route.name as string)
    },
    handleKeyEvent: (event: KeyboardEvent) => {
      // if (!sharedState.active) { return }

      const isAltMode = !!sharedState.altMode
      const isSpecialKey = Object.keys(ESpecialKeys)?.some(key => (event as any)[key])
      const isAllowedKeys = stateless.shortcuts?.reduce((acc: string[], cur: IShortcut) => {
        const singleKeys = cur.combinaisons
          ?.map(combinaison => !!combinaison.specialKeys || acc.includes(combinaison.key) ? null : combinaison.key)
          ?.filter(c => c)
          ?.flat()

        return [...singleKeys, ...acc] as string[]
      }, [
        // ? Also add special to handle passive type shortcuts keyup (specialKey show up as false in the event)
        ...Object.keys(ESpecialKeys)?.map(k => k.split('Key')[0])
      ])

      if (!isAltMode && !isSpecialKey && !isAllowedKeys) {
        return sharedState.altMode = false
      }

      const matchingShortcuts = [...stateless.shortcuts, ...sharedState.customShortcuts]
        ?.filter((shortcut: IShortcut) => {
          // ? CHECK ROUTE PATH
          if (!methods.allowOrigin(shortcut)) { return false }

          return shortcut.combinaisons
            ?.some(({ key, specialKeys, altMode }) => {
              // ? ALT MODE
              if (!!altMode && !sharedState.altMode || !altMode && sharedState.altMode) { return false }

              // ? SPECIAL KEYS
              if (shortcut.type !== 'passive' && specialKeys && !specialKeys?.some(key => event[key])) { return false }

              // ? KEY
              const activeMatch = key?.toLowerCase() === event.key?.toLowerCase()
              const passiveMatch = !key &&
                Object.keys(ESpecialKeys)?.map(k => k.split('Key')[0])
                  ?.map(k => k?.split('Key')[0])
                  ?.includes(event.key?.toLowerCase())

              // console.log({ activeMatch, passiveMatch, key, event: event.key?.toLowerCase() })

              return activeMatch || passiveMatch
            })
        })

        //
      matchingShortcuts.forEach((shortcut: IShortcut) => {
        // console.log({ type: event.type, shortcut })

        switch (event.type) {
          case 'keydown':
            shortcut.keydown?.()
            break

          case 'keyup':
            shortcut.type === 'passive' // Match 'passive' so default can be used as... default
              ? shortcut.keyup?.()
              : shortcut.action?.()
            break

          // Intentionnaly don't handle passive shortcut on manual trigger
          case 'manual':
            shortcut.action?.()
            break
        }

        // TODO prevent the combinaison to trigger system/navigator related stuff
        // * Note: may not exist if called by ShortcutAction.vue manual trigger
        if (event.type !== 'manual' && !shortcut.bypassPreventDefault) {
          event.preventDefault()
          event.stopPropagation()
          event.stopImmediatePropagation()
        }

        if (shortcut.preserveAltMode || event.type === 'keydown') { return }
        sharedState.altMode = false
      })
    }
  }

  onMounted(() => {
    // Here, I want to do this

    drawers.sharedState.tabs
      ?.map(tab => {
        return {
          id: `tabs_${tab.name}`,
          // description: `${wording.open} the ${wording.drawers[tab.name as keyof typeof wording.drawers]} ${wording.tab}.`,
          description: `${wording.open} the ${tab.label} ${wording.tab}.`,
          origin: 'cmsEditor',

          combinaisons: [
            { key: tab.shortcut, specialKeys: ['ctrlKey', 'metaKey'] }
          ],

          condition: () => drawers.sharedState.left.currentTab !== tab.name,
          action: () => {
            drawers.sharedState.left.show = true
            drawers.sharedState.left.active = true
            drawers.sharedState.left.currentTab = tab.name
          }
        } as IShortcut
      })
      ?.forEach(tabShorcut => {
        const existing = sharedState.customShortcuts.find(shortcut => shortcut.id === tabShorcut.id)
        if (!!existing) { return }

        sharedState.customShortcuts.push(tabShorcut)
      })

    if (!params.listen) { return }

    const targetWindow = params.iframe
      ? (window.parent.document.getElementById('iframe_' + myTreeId) as HTMLIFrameElement)?.contentWindow
      : window
    if (!targetWindow) { return }

    targetWindow.addEventListener('keyup', methods.handleKeyEvent)
    targetWindow.addEventListener('keydown', methods.handleKeyEvent)
  })

  onUnmounted(() => {
    if (!params.listen) { return }

    const targetWindow = params.iframe
      ? (window.parent.document.getElementById('iframe_' + myTreeId) as HTMLIFrameElement)?.contentWindow
      : window
    if (!targetWindow) { return }

    targetWindow.removeEventListener('keyup', methods.handleKeyEvent)
    targetWindow.addEventListener('keydown', methods.handleKeyEvent)
  })

  return {
    sharedState,
    stateless,
    state,
    methods
  }
}
