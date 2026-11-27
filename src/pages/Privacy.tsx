import { CART_KEY } from '../cart/cartStore'
import { PageHeading } from '../ui/PageHeading'

export default function Privacy() {
  return (
    <div className="page">
      <PageHeading>Privacy</PageHeading>
      <p className="page-lede">The full privacy notice is being written. It is coming.</p>
      <p>
        Your order-ahead cart is kept in this tab’s session storage, under <code>{CART_KEY}</code>, until the tab is
        closed. It holds what you chose to order, never who you are, and it is never sent anywhere until you place the
        order.
      </p>
    </div>
  )
}
