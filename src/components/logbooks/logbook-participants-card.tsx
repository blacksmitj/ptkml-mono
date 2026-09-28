"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { UserAvatar } from "@/components/user-avatar";

interface LogbookParticipantsCardProps {
  participants: any[];
}

export function LogbookParticipantsCard({ participants }: LogbookParticipantsCardProps) {
  const router = useRouter();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Users className="size-5" /> Peserta Hadir (<span className="font-mono">{participants.length}</span>)
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid sm:grid-cols-2 gap-4">
          {participants.map((p: any) => (
            <div 
              key={p.id} 
              className="flex items-center gap-3 p-3 border rounded-lg bg-card transition-colors" 
            >
              <UserAvatar name={p.profile?.name || "N/A"} src={p.profile?.photo} className="size-10" previewable />
              <div className="flex flex-col min-w-0">
                <p className="text-xs font-mono text-muted-foreground">{p.idTkm}</p>
                <span
                  onClick={() => router.push(`/applicants/${p.id}`)}
                  className="text-sm font-bold text-primary hover:underline cursor-pointer truncate"
                  title={p.profile?.name}
                >
                  {p.profile?.name}
                </span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
