import { useEffect, useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { linkContactToChannelAndTarget } from "@/components/people/PersonField";
import { writeCanonicalContactDetails } from "@/lib/contacts";

type Props = {
  open: boolean;
  onOpenChange: (o: boolean) => void;
};

export function InternalContactDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [jobTitle, setJobTitle] = useState("");
  const [email, setEmail] = useState("");
  const [mobile, setMobile] = useState("");

  useEffect(() => {
    if (!open) {
      setFirstName(""); setLastName(""); setJobTitle(""); setEmail(""); setMobile("");
    }
  }, [open]);

  const save = useMutation({
    mutationFn: async () => {
      const fn = firstName.trim();
      const ln = lastName.trim();
      if (!fn || !ln) throw new Error("First and last name are required");
      const { data: profile } = await supabase.from("profiles").select("org_id").single();
      if (!profile?.org_id) throw new Error("No organization");
      const { data, error } = await supabase
        .from("contacts")
        .insert({
          org_id: profile.org_id,
          first_name: fn,
          last_name: ln,
          name: `${fn} ${ln}`,
          active: true,
        } as any)
        .select("id")
        .single();
      if (error) throw error;
      const contactId = (data as any).id as string;
      await writeCanonicalContactDetails(contactId, {
        mobilePhone: mobile,
        email,
        role: jobTitle.trim() || "Internal",
      });
      await linkContactToChannelAndTarget(
        contactId,
        "Internal",
        jobTitle.trim() || "Internal",
        { kind: "none" },
      );
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["internal-contacts"] });
      toast.success("Internal contact added");
      onOpenChange(false);
    },
    onError: (e: Error) => toast.error(e.message),
  });


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>New Internal Contact</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>First Name *</Label>
              <Input value={firstName} onChange={(e) => setFirstName(e.target.value)} />
            </div>
            <div>
              <Label>Last Name *</Label>
              <Input value={lastName} onChange={(e) => setLastName(e.target.value)} />
            </div>
          </div>
          <div>
            <Label>Job Title / Role</Label>
            <Input value={jobTitle} onChange={(e) => setJobTitle(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Email</Label>
              <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div>
              <Label>Mobile Phone</Label>
              <Input value={mobile} onChange={(e) => setMobile(e.target.value)} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button onClick={() => save.mutate()} disabled={save.isPending}>
            {save.isPending ? "Saving…" : "Create Contact"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
