import { useEventListener } from '@vueuse/core'
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'

type PlotlyModule = typeof import('plotly.js-dist-min')
type PlotlyHTMLElement = import('plotly.js-dist-min').PlotlyHTMLElement

export function usePlotly(el: { value: HTMLDivElement | null }, props: any, emit: any) {
  let Plotly: PlotlyModule | null = null
  let plotHandle: PlotlyHTMLElement | null = null

  async function ensurePlotly() {
    if (!Plotly)
      Plotly = (await import('plotly.js-dist-min')).default as any
  }

  const defaultData = computed<Plotly.Data[]>(() => {
    if (props.type === 'map') {
      const dataObj: Plotly.Data[] = [
        {
          type: 'scattergeo',
          mode: 'markers',
          marker: {
            line: {
              width: 2,
              color: usePlotlyColor('text'),
            },
          },
          lat: [],
          lon: [],
          text: [],
        },
      ]
      return dataObj
    }

    const dataObj: Plotly.Data[] = [
      {
        type: 'scatter',
        mode: 'markers',
        marker: {
          line: {
            width: 2,
            color: usePlotlyColor('text'),
          },
        },
      },
    ]
    return dataObj
  })

  const defaultLayout = computed(() => {
    if (props.type === 'map') {
      const layout: Partial<Plotly.Layout> = {
        paper_bgcolor: usePlotlyColor('background'),
        margin: { l: 0, r: 0, t: 50, b: 0 },
        showlegend: false,
        geo: {
          projection: { type: 'natural earth' },
          scope: 'world',
          fitbounds: 'locations',
          showland: true,
          coastlinecolor: usePlotlyColor('mapBorder'),
          landcolor: usePlotlyColor('mapLand'),
          showocean: true,
          oceancolor: usePlotlyColor('mapOcean'),
          showlakes: true,
          lakecolor: usePlotlyColor('mapWater'),
          showrivers: true,
          rivercolor: usePlotlyColor('mapWater'),
          bgcolor: usePlotlyColor('background'),
          framecolor: usePlotlyColor('text'),
        } as any,
        title: {
          font: {
            family: 'YshiPen-ShutiTC',
            color: usePlotlyColor('text'),
            size: 20,
          },
          x: 0.5,
          xanchor: 'center',
          yanchor: 'top',
        },
      }
      return layout
    }

    const layout: Partial<Plotly.Layout> = {
      paper_bgcolor: usePlotlyColor('background'),
      plot_bgcolor: usePlotlyColor('background'),
      showlegend: false,
      margin: { l: 50, r: 50, t: 50, b: 50 },
      title: {
        font: {
          family: 'YshiPen-ShutiTC',
          color: usePlotlyColor('text'),
          size: 20,
        },
        x: 0.5,
        xanchor: 'center',
        yanchor: 'top',
      },
      hoverlabel: {
        bgcolor: usePlotlyColor('floatBg'),
        bordercolor: usePlotlyColor('floatBorder'),
        font: {
          color: usePlotlyColor('text'),
        },
      },
      xaxis: {
        title: {
          font: {
            family: 'YshiPen-ShutiTC',
            color: usePlotlyColor('text'),
          },
        },
        spikecolor: usePlotlyColor('line'),
        tickfont: {
          color: usePlotlyColor('label'),
        },
        zerolinecolor: usePlotlyColor('axis'),
        gridcolor: usePlotlyColor('grid'),
      },
      yaxis: {
        title: {
          font: {
            family: 'YshiPen-ShutiTC',
            color: usePlotlyColor('text'),
          },
        },
        tickfont: {
          color: usePlotlyColor('label'),
        },
        zerolinecolor: usePlotlyColor('axis'),
        gridcolor: usePlotlyColor('grid'),
        side: 'left',
      },
      yaxis2: {
        title: {
          font: {
            family: 'YshiPen-ShutiTC',
            color: usePlotlyColor('text'),
          },
        },
        tickfont: {
          color: usePlotlyColor('label'),
        },
        zerolinecolor: usePlotlyColor('axis'),
        gridcolor: usePlotlyColor('grid'),
      },
    }

    return layout
  })

  const defaultConfig = {
    displayModeBar: false,
    responsive: true,
  }

  const data = computed(() => deepMerge(props.data || {}, defaultData.value))
  const layout = computed(() => deepMerge(props.layout || {}, defaultLayout.value))
  const config = computed(() => deepMerge(props.config || {}, defaultConfig))

  function attachEvents(target: PlotlyHTMLElement | null) {
    if (!target || typeof target.on !== 'function')
      return
    target.removeAllListeners?.('plotly_click')
    target.removeAllListeners?.('plotly_hover')
    target.removeAllListeners?.('plotly_unhover')
    target.on('plotly_click', (event: any) => emit('plotlyClick', event))
    target.on('plotly_hover', (event: any) => emit('plotlyHover', event))
    target.on('plotly_unhover', (event: any) => emit('plotlyUnhover', event))
  }

  async function render() {
    if (!el.value)
      return
    await ensurePlotly()
    if (!Plotly)
      return
    // if (plotHandle) {
    //   await Plotly.react(el.value, data.value, layout.value, config.value)
    // }
    plotHandle = await Plotly.newPlot(el.value, data.value, layout.value, config.value)
    attachEvents(plotHandle)
  }

  onMounted(async () => {
    await nextTick()
    await render()
    useEventListener(window, 'resize', handleResize)
  })

  function handleResize() {
    if (!Plotly || !el.value)
      return
    Plotly.Plots.resize(el.value)
  }

  onBeforeUnmount(() => {
    if (Plotly && el.value)
      Plotly.purge(el.value)
    plotHandle = null
  })

  watch(() => [props.data, props.layout, props.config], () => {
    render()
  }, { deep: true })

  return {
    render,
  }
}
