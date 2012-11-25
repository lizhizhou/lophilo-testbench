ssh -o StrictHostKeyChecking=false lophilo@192.168.1.$1 "sudo systemd-journalctl _SYSTEMD_UNIT=lmc.service -a -f" &
ssh -o StrictHostKeyChecking=false lophilo@192.168.1.$1 "sudo tail -n 100 -f /var/log/dmesg" &
