/**
 * dragElement is HTMLEment while dragging
 * !! BUT !!
 * It needs to be converted to string (outerHTML) to be synced via postMessage
 * @note It is rebuild as HTMLElement once it is received
 */
export interface IDragSharedState {
  dragElement: any
  compoName: string|null

  /**
   * Notify via postMessage that the pageBuilderJson needs to be refreshed
   * @note watched in `use-dragndrop`
   */
  droppedComponent: {
    targetId: number,
    component: any,
    slot: any,
    treeId: any
  }
}