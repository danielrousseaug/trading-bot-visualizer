declare module 'react-plotly.js/factory' {
  import type Plotly from 'plotly.js-dist-min'
  import type { ComponentType } from 'react'
  export default function createPlotlyComponent(plotly: typeof Plotly): ComponentType<any>
}
declare module 'plotly.js-dist-min' {
  const Plotly: any
  export default Plotly
}


