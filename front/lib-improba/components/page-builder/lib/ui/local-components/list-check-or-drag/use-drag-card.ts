import { reactive } from 'vue';

const sharedState = reactive({
  dragElement: null as any,
  compoName: null as string|null,

  droppedComponent: null as any
});

export const useDragCard = () => {
  const methods = {
    onDragStart(e: any) {
      sharedState.dragElement = e.target;
      sharedState.compoName = e.target.getAttribute('id')

      e.dataTransfer.setData('card', e.target.id);
      e.dataTransfer.dropEffect = 'copy';
    },
    onDragEnd(e: any) {
      sharedState.dragElement = null;
      sharedState.compoName = null;
    },
    onDragEnter(e: any) {
      if (!e.target.hasAttribute('dropable')) return;
      e.preventDefault();

      e.target.classList.add('drag-enter');
    },
    onDragLeave(e: any) {
      if (!e.target.hasAttribute('dropable')) return;
      e.preventDefault();

      e.target.classList.remove('drag-enter');
      e.target.classList.remove('drag-over');
    },
    onDragOver(e: any) {
      if (!e.target.hasAttribute('dropable')) return;
      e.preventDefault();

      e.target.classList.add('drag-over');
    },
    onDrop(e: any): string | null {
      if (!e.target.hasAttribute('dropable')) return null;
      e.preventDefault();

      e.target.classList.remove('drag-enter');
      e.target.classList.remove('drag-over');

      const name = sharedState.compoName

      sharedState.dragElement = null;
      sharedState.compoName = null;

      return name
    },
  };

  return {
    methods,
    sharedState,
  };
};
