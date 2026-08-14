// dsh-precise-cache client bundle — DeepSeek Harness module-table format.
// Script execution only REGISTERS the factory; every module side effect
// (style injection) runs at materialization inside the factory closure.
// The handoff id must equal the package name (the boot graph entry name).
window.__ModuleLoader__.load({
  id: 'dsh-precise-cache',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    const React = require('react')

    /** Fixed decimal count of the readout (five, as requested). */
    const FRACTION_DIGITS = 5
    /** Dictionary namespace owned by this plugin. */
    const NS = 'preciseCache'
    /** Style tag id, claimed by the module loader and removed on unload. */
    const STYLE_ID = 'dsh-precise-cache/style'

    /**
     * Sum the three disjoint prompt-side billing buckets — the same
     * denominator the shipped stats line uses.
     * @param {object} usage - the session's token-usage projection value.
     * @returns {number} billed input tokens.
     */
    function billedInputTokens(usage) {
      return (usage.uncachedInputTokens || 0) + (usage.cacheReadTokens || 0) + (usage.cacheWriteTokens || 0)
    }

    /**
     * The readout: cache-hit share of billed input with five fixed decimals
     * and no rounding — the shipped line rounds to an integer, so any real
     * rate at or above 99.5% displays there as 100%.
     */
    function PreciseCacheHit(props) {
      const usage = props.useProjection('tokenUsage')
      if (usage === undefined) return null
      const denominator = billedInputTokens(usage)
      if (denominator === 0) return null
      const percent = (usage.cacheReadTokens || 0) / denominator * 100
      return React.createElement('span', { className: 'dsh-precise-cache' },
        props.t('label.cacheHit', { percent: percent.toFixed(FRACTION_DIGITS) }))
    }

    /** Inject the readout's stylesheet once (loader-claimed on materialization). */
    function injectStyles() {
      if (typeof document === 'undefined') return
      if (document.querySelector('style[data-plugin-css="' + STYLE_ID + '"]') !== null) return
      const tag = document.createElement('style')
      tag.dataset.plugin = 'dsh-precise-cache'
      tag.dataset.pluginCss = STYLE_ID
      tag.textContent =
        '.dsh-precise-cache{' +
        'display:block;text-align:center;' +
        'max-width:var(--dsh-chat-content-width);width:100%;margin:0 auto;box-sizing:border-box;' +
        'padding:4px calc(var(--dsh-composer-side-clearance) + 16px) 0px;' +
        'font-size:12px;line-height:20px;color:var(--dsw-alias-label-tertiary);' +
        'white-space:nowrap;overflow:hidden;text-overflow:ellipsis;}'
      document.head.appendChild(tag)
    }

    /** Required services: the slot registry and the readout's copy. */
    const inject = ['slots', 'locale']

    /** Client plugin body: register the dictionaries and the dock entry. */
    function apply(ctx) {
      ctx.effect(() => ctx.locale.register(NS, {
        zh: { 'label.cacheHit': '精确命中 {percent}%' },
        en: { 'label.cacheHit': 'Precise cache hit {percent}%' },
      }), 'dsh-precise-cache: dictionaries')

      ctx.slots.inject('conversation.composer.dock', () => {
        injectStyles()
        return ctx.slots.register(
          { name: 'conversation.composer.dock', id: 'precise-cache-hit', order: 1, locale: NS },
          PreciseCacheHit,
        )
      })
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
