import * as React from 'react'

import { EditorContext } from '@/components/editor.context'

export const useEditor = () => React.useContext(EditorContext)
