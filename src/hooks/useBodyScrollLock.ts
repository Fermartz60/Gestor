import { useEffect } from 'react'

let locks = 0
let restore: (() => void) | undefined

/** Keep the page locked until the last modal closes, including on unmount. */
export default function useBodyScrollLock(isOpen: boolean) {
  useEffect(() => {
    if (!isOpen) return
    if (locks === 0) {
      const elements = [document.body, document.documentElement]
      const previous = elements.map(element => ({
        element,
        value: element.style.getPropertyValue('overflow'),
        priority: element.style.getPropertyPriority('overflow'),
      }))
      elements.forEach(element => element.style.setProperty('overflow', 'hidden'))
      restore = () => previous.forEach(({ element, value, priority }) => {
        if (value) element.style.setProperty('overflow', value, priority)
        else element.style.removeProperty('overflow')
      })
    }
    locks += 1
    return () => {
      locks -= 1
      if (locks === 0) {
        restore?.()
        restore = undefined
      }
    }
  }, [isOpen])
}
