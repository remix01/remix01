'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, CheckCircle } from 'lucide-react';

export default function AdminSetupPage() {
  const router = useRouter();
  const [step, setStep] = useState<'check' | 'setup' | 'complete'>('check');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [formData, setFormData] = useState({
    ime: '',
    priimek: '',
  });

  async function checkSetupStatus() {
    try {
      setIsLoading(true);
      const response = await fetch('/api/admin/setup-status');
      const data = await response.json();

      if (data.needsSetup) {
        setStep('setup');
      } else {
        setStep('complete');
      }
    } catch (error) {
      console.error('Error checking setup status:', error);
    } finally {
      setIsLoading(false);
    }
  }

  async function handleSetup() {
    try {
      setIsSaving(true);
      const response = await fetch('/api/admin/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        alert('Error: ' + (data.error || 'Setup failed'));
        return;
      }

      setStep('complete');
    } catch (error) {
      console.error('Error setting up admin:', error);
      alert('An error occurred during setup');
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (step === 'complete') {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-600" />
            </div>
            <CardTitle className="text-2xl">Setup uspešen!</CardTitle>
            <CardDescription>
              Admin račun je bil uspešno konfiguriran
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              onClick={() => router.push('/admin')}
              className="w-full"
            >
              Pojdi na admin panelko
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-b from-background to-muted/50 p-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl">Admin Setup</CardTitle>
          <CardDescription>
            Inicializiraj super admin račun
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="ime">Ime</Label>
            <Input
              id="ime"
              placeholder="Janez"
              value={formData.ime}
              onChange={(e) =>
                setFormData({ ...formData, ime: e.target.value })
              }
            />
          </div>
          <div>
            <Label htmlFor="priimek">Priimek</Label>
            <Input
              id="priimek"
              placeholder="Novak"
              value={formData.priimek}
              onChange={(e) =>
                setFormData({ ...formData, priimek: e.target.value })
              }
            />
          </div>
          <Button
            onClick={handleSetup}
            disabled={isSaving || !formData.ime || !formData.priimek}
            className="w-full"
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Nastavljam...
              </>
            ) : (
              'Nastavi Super Admin'
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
