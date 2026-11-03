'use client';

import React from 'react';
import { Loader2, CircleCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogClose, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { SectionRenderer } from './SectionRenderer';
import { useOnboardingState } from '../hooks/useOnboardingState';
import { useOnboardingApi } from '../hooks/useOnboardingApi';
import { SECTION_DEFINITIONS, TEMPLATES, type TemplateKey } from '../config/templates';
import { getItemsFromJsonData } from '../utils/dataUtils';

const CHOICES: TemplateKey[] = ['full', 'minimal'];

export default function OnboardingDialog({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const s = useOnboardingState();
  const { runOnboarding } = useOnboardingApi({
    currentJsonData: s.currentJsonData,
    setProgress: s.setProgress,
    setItemLoading: s.setItemLoading,
    setItemCompleted: s.setItemCompleted,
    setItemError: s.setItemError,
    setStep: s.setStep,
    setError: s.setError,
    setIsLoading: s.setIsLoading,
    resetOnboardingState: s.resetOnboardingState,
  });
  if (!isOpen) return null;
  const done = s.step === 'done';
  const counts = SECTION_DEFINITIONS.filter((d) => ['athletes', 'contracts', 'deals', 'brands'].includes(d.type)).map((d) => `${getItemsFromJsonData(s.currentJsonData, d.type).length} ${d.label.toLowerCase()}`);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="flex max-h-[calc(100dvh-2rem)] max-w-[95vw] flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="shrink-0 border-b px-4 py-4 sm:px-6">
          <DialogTitle>Agency setup</DialogTitle>
        </DialogHeader>
        <div className="flex min-h-0 flex-1 flex-col overflow-hidden lg:flex-row">
          <div className="shrink-0 p-4 sm:p-6 lg:w-80 lg:border-r">
            {done ? (
              <div className="space-y-2 text-sm">
                <h4 className="font-medium">Setup saved</h4>
                <p className="text-muted-foreground">{counts.join(', ')}.</p>
                <p className="flex items-center gap-2 text-muted-foreground"><CircleCheck className="h-4 w-4" /> Payment providers need Stripe keys in the environment.</p>
              </div>
            ) : s.isLoading ? (
              <div>
                <h4 className="text-sm font-medium">Creating {s.selectedTemplate === 'minimal' ? 'basic' : 'complete'} setup</h4>
                <p className="mt-1 text-sm text-muted-foreground">{s.progressMessage}</p>
              </div>
            ) : (
              <>
                <h4 className="mb-3 text-sm font-medium">Setup type</h4>
                <RadioGroup value={s.selectedTemplate} onValueChange={(v) => s.setSelectedTemplate(v as TemplateKey)} className="space-y-3">
                  {CHOICES.map((key) => (
                    <Label key={key} htmlFor={`tpl-${key}`} className={`flex cursor-pointer items-start gap-3 rounded-md border p-3 ${s.selectedTemplate === key ? 'border-primary' : ''}`}>
                      <RadioGroupItem value={key} id={`tpl-${key}`} className="mt-1" />
                      <span>
                        <span className="block text-sm font-medium">{TEMPLATES[key].name}</span>
                        <span className="block text-sm font-normal text-muted-foreground">{TEMPLATES[key].description}</span>
                      </span>
                    </Label>
                  ))}
                </RadioGroup>
              </>
            )}
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            <SectionRenderer
              sections={SECTION_DEFINITIONS as any}
              selectedTemplate={s.selectedTemplate}
              isLoading={s.isLoading}
              loadingItems={s.loadingItems}
              completedItems={s.completedItems}
              itemErrors={s.itemErrors}
              error={s.error}
              step={s.step}
              currentJsonData={s.currentJsonData}
            />
          </div>
        </div>
        <div className="shrink-0 border-t">
          {s.error && !s.isLoading && !done && <p className="border-b px-4 py-2 text-sm text-destructive">{s.error} Saved records are reused on retry.</p>}
          <div className="flex gap-2 p-4">
            <DialogClose asChild>
              <Button type="button" variant={done ? 'outline' : 'ghost'} disabled={s.isLoading} className="flex-1 sm:flex-none">{done ? 'Close' : 'Cancel'}</Button>
            </DialogClose>
            {!done && (s.isLoading ? (
              <Button disabled className="flex-1 sm:flex-none"><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating</Button>
            ) : (
              <Button onClick={runOnboarding} className="flex-1 sm:flex-none">{s.error ? 'Retry setup' : 'Confirm'}</Button>
            ))}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
