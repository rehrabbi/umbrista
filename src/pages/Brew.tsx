import { lazy, useId, useState, type ChangeEvent, type FormEvent } from 'react'
import { Link } from 'react-router'
import {
  BEANS,
  DEFAULT_BREW,
  METHODS,
  MILKS,
  ROASTS,
  brewLook,
  brewName,
  brewPrice,
  type BrewChoice,
  type BrewOption,
} from '../../shared/brew'
import { formatTotal } from '../../shared/money'
import { useCart } from '../cart/CartProvider'
import { MAX_BREW_NAME, cartCount, cartTotal } from '../cart/cartStore'
import { SceneHost } from '../scene/SceneHost'
import { Button } from '../ui/Button'
import { Field } from '../ui/Field'
import { PageHeading } from '../ui/PageHeading'
import { toast } from '../ui/toast-store'
import './Brew.css'

// The cup's scene imports three, drei and the model's decoder: it loads with its canvas, never with the page.
const BrewCup = lazy(() => import('../scene/cup/BrewCup'))

type Part = 'beans' | 'roast' | 'method' | 'milk'

const CREMA_WORDS: Record<BrewChoice['roast'], string> = { light: 'pale gold', medium: 'hazel', dark: 'dark brown' }

/** How full the cup is, in words. */
function depthWords(fill: number): string {
  if (fill < 0.05) return 'a cup a few sips deep'
  if (fill < 0.2) return 'a short cup'
  if (fill < 0.6) return 'half a cup'
  return 'a full cup'
}

/**
 * The cup in words, with its price: what the 3D cup shows, for everyone. The choice carries no name
 * (the page keeps the visitor's name apart), so typing one says nothing.
 */
function describeCup(choice: BrewChoice): string {
  const look = brewLook(choice)
  const roast = ROASTS.find((option) => option.id === choice.roast)!
  const milk = MILKS.find((option) => option.id === choice.milk)!
  const crema = `${CREMA_WORDS[choice.roast]} crema`
  const depth = depthWords(look.fill)
  const surface =
    look.foam <= 0
      ? `${depth} under a ${crema}`
      : look.foam < 0.75
        ? `${depth}, a spot of milk foam blooming through a ${crema}`
        : `${depth}, a rosetta of ${milk.phrase} on top`
  return `${brewName(choice)}, ${roast.label.toLowerCase()} roast: ${surface}. ${formatTotal(brewPrice(choice))}.`
}

interface ChoiceGroupProps {
  legend: string
  part: Part
  options: readonly BrewOption[]
  value: string
  onChange: (part: Part, value: string) => void
}

/** One choice: a fieldset of radios, each option's note tied to it as its description. */
function ChoiceGroup({ legend, part, options, value, onChange }: ChoiceGroupProps) {
  const id = useId()
  return (
    <fieldset className="brew-group">
      <legend className="brew-legend">{legend}</legend>
      <div className="brew-options">
        {options.map((option) => {
          const optionId = `${id}-${option.id}`
          return (
            <div key={option.id} className="brew-option">
              <input
                type="radio"
                id={optionId}
                name={`${id}-${part}`}
                value={option.id}
                checked={value === option.id}
                onChange={(event: ChangeEvent<HTMLInputElement>) => onChange(part, event.target.value)}
                aria-describedby={`${optionId}-note`}
                className="brew-radio"
              />
              <label htmlFor={optionId} className="brew-option-label">
                {option.label}
              </label>
              <p id={`${optionId}-note`} className="brew-option-note">
                {option.note}
              </p>
            </div>
          )
        })}
      </div>
    </fieldset>
  )
}

/** What the order holds so far, with the way to it. Not a live region: adding says so in a toast. */
function OrderNote() {
  const { lines } = useCart()
  const count = cartCount(lines)
  if (count === 0) return null
  return (
    <p className="brew-order">
      Your order: {count} {count === 1 ? 'item' : 'items'}, {formatTotal(cartTotal(lines))}.{' '}
      <Link to="/order">See your order</Link>
    </p>
  )
}

/**
 * Brew-your-own: a plain form (the beans, the roast, how it is pulled, the milk and, if the visitor
 * likes, a name) beside the hero cup, whose coffee follows every choice. A live line says what the
 * cup holds and what it costs, so nothing depends on the 3D, which starts only on the visitor's
 * first intent, over the cup's still. "Add to order" puts the drink in the cart as a line of its own.
 */
export default function Brew() {
  const { dispatch } = useCart()
  const [choice, setChoice] = useState<BrewChoice>(DEFAULT_BREW)
  const [name, setName] = useState('')

  const choose = (part: Part, value: string) => setChoice((current) => ({ ...current, [part]: value }))

  const add = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const given = name.trim().slice(0, MAX_BREW_NAME)
    const drink: BrewChoice = given ? { ...choice, name: given } : { ...choice }
    const title = brewName(drink)
    dispatch({
      type: 'add',
      line: {
        id: ['custom', drink.beans, drink.roast, drink.method, drink.milk, given].join(':'),
        itemId: 'custom',
        name: title,
        options: drink,
        unitPrice: brewPrice(drink),
      },
    })
    toast(`${title} is in your order.`, { kind: 'success' })
  }

  return (
    <div className="page brew-page">
      <header className="brew-intro">
        <PageHeading>Brew your own</PageHeading>
        <p className="page-lede">Choose the beans, the roast, the pull and the milk, and name it if you like. The cup follows each choice.</p>
        <p className="brew-key">Prices in crowns, the money of Calvessa. Nothing here is for sale.</p>
      </header>

      <div className="brew-layout">
        <div className="brew-cup">
          <SceneHost className="brew-scene" still="cup-still" sizes="(min-width: 60rem) 34rem, 92vw" swap antialias onDemand>
            <BrewCup choice={choice} />
          </SceneHost>
        </div>

        <form aria-label="Brew your own drink" className="brew-form" onSubmit={add}>
          <ChoiceGroup legend="Beans" part="beans" options={BEANS} value={choice.beans} onChange={choose} />
          <ChoiceGroup legend="Roast" part="roast" options={ROASTS} value={choice.roast} onChange={choose} />
          <ChoiceGroup legend="Method" part="method" options={METHODS} value={choice.method} onChange={choose} />
          <ChoiceGroup legend="Milk" part="milk" options={MILKS} value={choice.milk} onChange={choose} />
          <Field
            label="Name the drink (optional)"
            hint={`Up to ${MAX_BREW_NAME} characters. Left empty, it is called ${brewName(choice)}.`}
            maxLength={MAX_BREW_NAME}
            autoComplete="off"
            value={name}
            onChange={(event: ChangeEvent<HTMLInputElement>) => setName(event.target.value)}
          />
          <div className="brew-summary">
            <p aria-live="polite" aria-atomic="true" className="brew-description">
              {describeCup(choice)}
            </p>
            <Button type="submit">Add to order</Button>
            <OrderNote />
          </div>
        </form>
      </div>
    </div>
  )
}
