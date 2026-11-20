import { useSyncExternalStore } from 'react'
import { estadoConta, ouvirConta } from '../../data/conta'

/** Conta local e sessão, ao vivo (cadastro, entrada, saída e outras abas). */
export const useConta = () => useSyncExternalStore(ouvirConta, estadoConta)
