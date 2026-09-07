import { Check, Gift, Sparkles } from 'lucide-react'
import './PaymentTool.css'

/** Billing UI retired — Helios Space is completely free. */
export function PaymentTool({ mode = 'settings' }: { mode?: 'settings' | 'onboarding' }) {
  return (
    <div className="payment-tool is-free-forever" aria-labelledby="payment-tool-title">
      <header>
        <span><Gift size={13} /> FREE FOREVER</span>
        <h3 id="payment-tool-title">
          {mode === 'onboarding' ? 'Helios Space 完全免费' : '无需付款'}
        </h3>
        <p>没有套餐，没有升级。创建即可使用全部 Create、Space 与 Messages。</p>
      </header>
      <ul className="payment-free-points">
        <li><Check size={14} /> 墨语、随身本、格间、今日事、搭子码</li>
        <li><Check size={14} /> 文稿不限篇数与字数</li>
        <li><Check size={14} /> 无需绑卡</li>
      </ul>
      <div className="payment-current-note">
        <Sparkles size={14} /> 你已经在免费的 Helios Space 里。
      </div>
    </div>
  )
}
