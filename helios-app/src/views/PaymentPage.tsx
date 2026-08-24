import { useEffect, useState } from 'react'
import { ArrowUpRight, Check, CreditCard, Gift, Lock, ShieldCheck, Sparkles } from 'lucide-react'
import { api, type BillingSnapshot, type User } from '../api'
import { AuthScreen } from '../components/AuthScreen'
import { Logo } from '../components/Logo'
import { leavePay } from '../product/pay'
import { useApp } from '../store/appStore'
import './PaymentPage.css'

function formatPrice(cents: number) {
  if (cents <= 0) return '$0'
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(cents / 100)
}

export function PaymentPage() {
  const { state, dispatch } = useApp()
  const [billing, setBilling] = useState<BillingSnapshot | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [needAuth, setNeedAuth] = useState(false)
  const [notice, setNotice] = useState('')

  useEffect(() => {
    document.title = '付款 — Helios Space'
    const params = new URLSearchParams(window.location.search)
    if (params.get('billing') === 'cancel') {
      setNotice('已取消付款。银行卡还没有扣款，可以再试一次。')
      params.delete('billing')
      const next = params.toString()
      window.history.replaceState({}, '', '/pay' + (next ? '?' + next : ''))
    }
  }, [])

  useEffect(() => {
    if (!state.user) return
    let cancelled = false
    api.billing.get().then(snapshot => {
      if (!cancelled) setBilling(snapshot)
    }).catch(reason => {
      if (!cancelled) setError((reason as Error).message)
    })
    return () => { cancelled = true }
  }, [state.user])

  const currentPlan = billing?.plan ?? state.user?.plan ?? 'free'
  const stripeEnabled = !state.user || billing == null || Boolean(billing.stripe?.enabled)

  function applyUser(user: User) {
    dispatch({ type: 'SET_USER', user })
  }

  async function stayFree() {
    if (!state.user) {
      setNeedAuth(true)
      return
    }
    setBusy('free')
    setError('')
    try {
      const result = await api.billing.checkout({ plan: 'free' })
      setBilling(result.billing)
      applyUser(result.user)
      dispatch({
        type: 'PUSH_TOAST',
        toast: { id: String(Date.now()), message: '已使用 Free。表格和核心应用仍然可用。', tone: 'success' },
      })
      leavePay('/')
    } catch (reason) {
      setError((reason as Error).message)
    } finally {
      setBusy(null)
    }
  }

  async function payOnStripe() {
    if (!state.user) {
      setNeedAuth(true)
      return
    }
    setBusy('stripe')
    setError('')
    try {
      const session = await api.billing.stripe('orbit')
      window.location.assign(session.url)
    } catch (reason) {
      setError((reason as Error).message)
      setBusy(null)
    }
  }

  if (needAuth && !state.user) {
    return (
      <AuthScreen
        defaultMode="register"
        onBack={() => setNeedAuth(false)}
        onAuth={(user: User) => {
          applyUser(user)
          setNeedAuth(false)
          api.projects.list()
            .then(result => dispatch({ type: 'SET_PROJECTS', projects: result.projects }))
            .catch(() => {})
        }}
      />
    )
  }

  return (
    <div className="pay-page">
      <header className="pay-top">
        <button type="button" className="pay-logo" onClick={() => leavePay('/')}>
          <Logo size="sm" />
        </button>
        {state.user && (
          <button type="button" className="pay-back" onClick={() => leavePay('/')}>
            返回 Helios
          </button>
        )}
      </header>

      <main className="pay-main">
        <div className="pay-intro">
          <span><CreditCard size={14} /> 付款</span>
          <h1>在外部平台用银行卡支付</h1>
          <p>
            选择套餐后，Helios 会跳转到 Stripe 安全付款页。卡号只在 Stripe 填写，Helios 看不到完整卡号。
            付完会自动回到这里开通 Orbit。
          </p>
        </div>

        {notice && <div className="pay-notice" role="status">{notice}</div>}
        {error && <div className="pay-error" role="alert">{error}</div>}
        {currentPlan === 'orbit' && (
          <div className="pay-notice is-success" role="status">
            Orbit 已开通。银行卡付款已到账。
          </div>
        )}

        <div className="pay-grid">
          <article className={'pay-card' + (currentPlan === 'free' ? ' is-current' : '')}>
            <header>
              <i><Gift size={18} /></i>
              <div>
                <small>INCLUDED</small>
                <strong>Free</strong>
              </div>
              <b>$0 <em>forever</em></b>
            </header>
            <p>Word、Excel、PowerPoint、OneNote 一直可用。表格不设付费门槛。</p>
            <ul>
              <li><Check size={14} /> 核心 365 应用，含表格</li>
              <li><Check size={14} /> 60 篇文稿</li>
              <li><Check size={14} /> 每篇 40,000 字</li>
              <li><Check size={14} /> 不用绑定银行卡</li>
            </ul>
            <button
              type="button"
              className="pay-free-btn"
              onClick={() => void stayFree()}
              disabled={busy !== null || (currentPlan === 'free' && Boolean(state.user?.plan_selected))}
            >
              {currentPlan === 'free' && state.user?.plan_selected ? '当前是 Free' : busy === 'free' ? '正在切换…' : '继续免费使用'}
            </button>
          </article>

          <article className={'pay-card is-orbit' + (currentPlan === 'orbit' ? ' is-current' : '')}>
            <header>
              <i><Sparkles size={18} /></i>
              <div>
                <small>ORBIT</small>
                <strong>Orbit</strong>
              </div>
              <b>{formatPrice(900)} <em>/ 月</em></b>
            </header>
            <p>更多文稿额度，以及 Stocks 和学校 / 工作套件。</p>
            <ul>
              <li><Check size={14} /> Free 的全部内容，含表格</li>
              <li><Check size={14} /> 文稿不限篇数</li>
              <li><Check size={14} /> 每篇 500,000 字</li>
              <li><Check size={14} /> 完整 Mini Apps</li>
              <li><Check size={14} /> Stripe 银行卡付款</li>
            </ul>
            {currentPlan === 'orbit' ? (
              <div className="pay-current">Orbit 已在这个账号上生效。</div>
            ) : (
              <button
                type="button"
                className="pay-stripe-btn"
                onClick={() => void payOnStripe()}
                disabled={busy !== null || (Boolean(state.user) && !stripeEnabled)}
              >
                <Lock size={15} />
                {busy === 'stripe'
                  ? '正在打开 Stripe…'
                  : state.user
                    ? '前往 Stripe 用银行卡支付'
                    : '登录后前往 Stripe 付款'}
                <ArrowUpRight size={15} />
              </button>
            )}
          </article>
        </div>

        <aside className="pay-trust">
          <ShieldCheck size={16} />
          <div>
            <strong>跳转到 Stripe Checkout</strong>
            <p>Visa、Mastercard、American Express 等银行卡。付款地址在 stripe.com，不是 Helios 自己的表单。</p>
          </div>
        </aside>
      </main>
    </div>
  )
}
