import {InputManager} from '../../../../shared/input/input-manager.js';

/** Keep the shared manager's locking/keyboard/visibility behavior, while retaining
 * the native event name (shared pointer detail.type currently holds pointerType).
 * Capture runs before the shared bubble listener, without generating another input.
 */
export function connectInput(target:HTMLElement,onInput:(detail:any)=>void){
 const types=['pointerdown','pointerup','pointermove','pointercancel'];
 let pointerEventType='';
 const capture=(event:Event)=>{pointerEventType=event.type;};
 for(const type of types)target.addEventListener(type,capture,true);
 const manager=new InputManager(target as unknown as Document);
 const handle=(event:Event)=>{
  const detail=(event as CustomEvent).detail;
  const type=['mouse','touch','pen',''].includes(detail.type)?pointerEventType:detail.type;
  onInput({...detail,type});
 };
 manager.addEventListener('input',handle);
 return ()=>{manager.removeEventListener('input',handle);manager.destroy();for(const type of types)target.removeEventListener(type,capture,true);};
}
