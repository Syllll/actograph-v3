import { IField } from '../interfaces/field.interface';
import {
  IFieldStyle,
  IRowStyle,
  IColStyle,
} from '../interfaces/style.interface';
import { useTools } from './use-tools';

export const useClassMapper = () => {
  const tools = useTools();

  const methods = {
    mapRowClasses(style: IRowStyle): string {
      if (!style) {
        return '';
      }
      const classes = [];

      // ? Simple string
      const direct = ['reverse'];

      // ? Replace the key by the val
      const onlyVal = ['orientation'];

      // ? Add the key then the value (ex: items-center)
      const keyVal = ['items', 'justify'];

      // ? Add a q in front of the key AND the value (ex: q-qutter-sm)
      const QKeyVal = ['gutter', 'colGutter'];

      classes.push(
        direct.map((attr: any) => (style[attr as keyof IRowStyle] ? attr : ''))
      );
      classes.push(
        onlyVal.map((attr: any) =>
          style[attr as keyof IRowStyle] ? style[attr as keyof IRowStyle] : ''
        )
      );
      classes.push(
        keyVal.map((attr: any) =>
          style[attr as keyof IRowStyle]
            ? `${attr}-${style[attr as keyof IRowStyle]}`
            : ''
        )
      );
      classes.push(
        QKeyVal.map((attr: any) =>
          style[attr as keyof IRowStyle]
            ? `q-${attr}-${style[attr as keyof IRowStyle]}`
            : ''
        )
      );
      // console.log({ classes })

      const filtered = classes
        ?.flat()
        ?.filter((c) => c)
        ?.join(' ');
      // console.log({ filtered })

      const kebabed = tools.methods.mapIntoKebab(filtered);
      // console.log({ kebabed })

      return kebabed;
    },

    mapColClasses(style: IFieldStyle, options: { errored: boolean }): string {
      if (!style) {
        return '';
      }
      const mapped = Object.entries(style)
        .map(([name, value]) => {
          if (['static', 'directives'].includes(name)) {
            return '';
          }

          // ? if { [key]: 'primary' }
          if (typeof value === 'string') {
            return `${name}-${value}`;
          }

          // ? if { [key]: { base: 'primary', hover: 'primary-40' } }
          return Object.entries(value)
            .map(([ename, evalue]) => {
              let current = '';

              switch (ename) {
                case 'base':
                  if (!value['errored'] || !options.errored) {
                    current += `${name}-${evalue}`;
                  }
                  break;

                case 'hover':
                  if (!value['erroredHover'] || !options.errored) {
                    current += `hover:${name}-${evalue}`;
                  }
                  break;

                case 'focus':
                  if (!value['erroredFocus'] || !options.errored) {
                    current += `focus:${name}-${evalue}`;
                  }
                  break;

                case 'errored':
                  if (options.errored) {
                    current += `${name}-${evalue}`;
                  }
                  break;

                case 'erroredHover':
                  if (options.errored) {
                    current += `hover:${name}-${evalue}`;
                  }
                  break;

                case 'erroredFocus':
                  if (options.errored) {
                    current += `focus:${name}-${evalue}`;
                  }
                  break;
              }

              return current;
            })
            ?.join(' ');
        })
        ?.join(' ');

      const final = `${style.static?.trim()} ${mapped?.trim()}`;

      return final;
    },

    mapBreakpointClasses(field: IField): string {
      if (!field) {
        return '';
      }
      if (!field?.cols) {
        return 'col';
      }

      const { cols } = field;

      if (['string', 'number'].includes(typeof cols)) {
        return `col-${cols}`;
      }

      return Object.entries(cols)
        ?.map(([name, value]) => {
          const mapped = `col-${name !== 'base' ? name + '-' : ''}${value}`;

          return mapped;
        })
        ?.join(' ');
    },
  };

  return {
    methods,
  };
};
