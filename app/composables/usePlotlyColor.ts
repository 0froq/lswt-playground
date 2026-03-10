import type { PlotlyColorElement } from '~/types/plotly'

export function usePlotlyColor(el: keyof PlotlyColorElement): string {
  const color = useColorMode()
  const isDark = color.value === 'dark'
  const colorMap: Record<string, string> = {
    title: isDark ? '#fafafa' : '#0a0a0a',
    background: isDark ? '#171717' : '#f5f5f5',
    grid: isDark ? '#262626' : '#e5e5e5',
    text: isDark ? '#f0f0f0' : '#202020',
    line: isDark ? '#a3a3a3' : '#525252',
    lineMuted: isDark ? '#525252' : '#a3a3a3',
    marker: isDark ? '#e5e5e5' : '#262626',
    markerBorder: isDark ? '#f0f0f0' : '#202020',
    floatBg: isDark ? '#2c2c2c' : '#e0e0e0',
    floatBorder: isDark ? '#525252' : '#a3a3a3',
    axis: isDark ? '#e5e5e5' : '#262626',
    label: isDark ? '#d4d4d4' : '#404040',
    mapLand: isDark ? '#2c2c2c' : '#e0e0e0',
    mapWater: isDark ? '#0e7490' : '#67e8f9',
    mapOcean: isDark ? '#0a0a0a' : '#fafafa',
    mapBorder: isDark ? '#525252' : '#a3a3a3',
    // Add more elements as needed
  }
  return colorMap[el] || 'red'
}
