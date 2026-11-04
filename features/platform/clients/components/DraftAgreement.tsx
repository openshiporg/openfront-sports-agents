'use client'
import { useRef, useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { runAgencyCommand } from '../../actions/agency'

export function DraftAgreement({ athleteId }: { athleteId: string }) {
 const router=useRouter(),key=useRef(crypto.randomUUID())
 const [cap,setCap]=useState('300'),[error,setError]=useState(''),[pending,start]=useTransition()
 return <form className="flex flex-wrap items-end gap-2 p-3" onSubmit={e=>{e.preventDefault();setError('');start(async()=>{const result=await runAgencyCommand('draftRepresentationAgreement',{athleteId,capBps:Number(cap),idempotencyKey:key.current});if(!result.success){setError(result.error);key.current=crypto.randomUUID()}else router.refresh()})}}>
 <label className="text-sm">Union cap (basis points)<Input type="number" min={0} max={10000} step={1} required value={cap} onChange={e=>setCap(e.target.value)} /></label>
 <Button disabled={pending} variant="outline" size="sm">{pending?'Working':'Draft with agency rates'}</Button>
 {error&&<p role="alert" className="w-full text-sm text-destructive">{error}</p>}
 </form>
}
