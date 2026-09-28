"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";

interface FollowUpMentorNoteCardProps {
  mentorNote: string;
  onMentorNoteChange: (val: string) => void;
  isReadOnly: boolean;
}

export function FollowUpMentorNoteCard({
  mentorNote,
  onMentorNoteChange,
  isReadOnly,
}: FollowUpMentorNoteCardProps) {
  return (
    <Card className="shadow-sm border-border/80">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl font-bold tracking-tight">Catatan Akhir Pendamping</CardTitle>
        <CardDescription>
          Uraian naratif mengenai komitmen peserta, potensi keberlanjutan usaha, dan catatan khusus
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isReadOnly ? (
          <div className="text-sm p-4 rounded-xl bg-muted/30 border leading-relaxed whitespace-pre-wrap">
            {mentorNote || <span className="text-muted-foreground italic">Tidak ada catatan akhir.</span>}
          </div>
        ) : (
          <Textarea
            value={mentorNote}
            onChange={(e) => onMentorNoteChange(e.target.value)}
            placeholder="Tuliskan catatan evaluasi menyeluruh mengenai perkembangan usaha peserta dan kesiapan pasca-pendampingan..."
            className="min-h-[120px] text-sm resize-y"
          />
        )}
      </CardContent>
    </Card>
  );
}
